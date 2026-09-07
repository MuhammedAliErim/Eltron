import { GuildMember, EmbedBuilder, Colors } from 'discord.js';
import { Cache } from '../../utils/cache';
import {
  GuildQuarantineConfigRow,
  RiskLevel,
} from '../../database/schema';
import { getRiskLevel } from './RiskScoringService';
import { logger } from '../../utils/logger';

interface QuarantineEntry {
  userId: string;
  guildId: string;
  quarantinedAt: number;
  durationMs: number;
  reason: string;
  performedBy: string | null;
}

const quarantineCache = new Cache<QuarantineEntry>(86400000);

const getQuarantineKey = (guildId: string, userId: string): string =>
  `q:${guildId}:${userId}`;

const RISK_LEVEL_ORDER: Record<RiskLevel, number> = {
  LOW: 0,
  MODERATE: 1,
  ELEVATED: 2,
  HIGH: 3,
  CRITICAL: 4,
};

const canBypass = (
  member: GuildMember,
  config: GuildQuarantineConfigRow
): boolean => {
  if (member.user.bot) return true;
  if (member.id === member.guild.ownerId) return true;
  if (config.bypass_users.includes(member.id)) return true;
  for (const roleId of config.bypass_roles) {
    if (member.roles.cache.has(roleId)) return true;
  }
  return false;
};

const isQuarantined = (guildId: string, userId: string): boolean => {
  const entry = quarantineCache.get(getQuarantineKey(guildId, userId));
  if (!entry) return false;

  const now = Date.now();
  if (now - entry.quarantinedAt > entry.durationMs) {
    quarantineCache.delete(getQuarantineKey(guildId, userId));
    return false;
  }

  return true;
};

export const quarantineMember = async (
  member: GuildMember,
  config: GuildQuarantineConfigRow,
  reason: string,
  performedBy: string | null,
  durationSeconds?: number
): Promise<{
  success: boolean;
  message: string;
  quarantined: boolean;
}> => {
  if (!config.enabled) {
    return { success: false, message: 'Quarantine is disabled.', quarantined: false };
  }

  if (!config.quarantine_role_id) {
    return { success: false, message: 'No quarantine role configured.', quarantined: false };
  }

  if (canBypass(member, config)) {
    return { success: false, message: 'This user cannot be quarantined.', quarantined: false };
  }

  if (isQuarantined(member.guild.id, member.id)) {
    return { success: false, message: 'User is already quarantined.', quarantined: false };
  }

  const quarantineRole = member.guild.roles.cache.get(config.quarantine_role_id);
  if (!quarantineRole) {
    return { success: false, message: 'Quarantine role not found.', quarantined: false };
  }

  if (member.guild.members.me && quarantineRole.position >= member.guild.members.me.roles.highest.position) {
    return { success: false, message: 'Cannot assign quarantine role: hierarchy.', quarantined: false };
  }

  if (member.roles.highest.position >= (member.guild.members.me?.roles.highest.position ?? 0)) {
    return { success: false, message: 'Cannot quarantine this user: role hierarchy.', quarantined: false };
  }

  const durationMs = (durationSeconds ?? config.quarantine_duration_seconds) * 1000;
  const maxDurationMs = config.max_quarantine_duration_seconds * 1000;
  const finalDurationMs = Math.min(durationMs, maxDurationMs);

  try {
    await member.roles.add(config.quarantine_role_id);

    quarantineCache.set(getQuarantineKey(member.guild.id, member.id), {
      userId: member.id,
      guildId: member.guild.id,
      quarantinedAt: Date.now(),
      durationMs: finalDurationMs,
      reason,
      performedBy,
    });

    logger.info({
      guildId: member.guild.id,
      userId: member.id,
      reason,
      performedBy,
      durationSeconds: Math.floor(finalDurationMs / 1000),
    }, 'User quarantined');

    return {
      success: true,
      message: `User quarantined for ${Math.floor(finalDurationMs / 1000)}s.`,
      quarantined: true,
    };
  } catch (error) {
    logger.error({ err: error, guildId: member.guild.id, userId: member.id }, 'Failed to quarantine user');
    return { success: false, message: 'Failed to assign quarantine role.', quarantined: false };
  }
};

export const releaseMember = async (
  member: GuildMember,
  config: GuildQuarantineConfigRow,
  performedBy: string | null
): Promise<{
  success: boolean;
  message: string;
}> => {
  if (!config.quarantine_role_id) {
    return { success: false, message: 'No quarantine role configured.' };
  }

  if (!isQuarantined(member.guild.id, member.id)) {
    return { success: false, message: 'User is not quarantined.' };
  }

  try {
    if (member.roles.cache.has(config.quarantine_role_id)) {
      await member.roles.remove(config.quarantine_role_id);
    }

    quarantineCache.delete(getQuarantineKey(member.guild.id, member.id));

    logger.info({
      guildId: member.guild.id,
      userId: member.id,
      performedBy,
    }, 'User released from quarantine');

    return { success: true, message: 'User released from quarantine.' };
  } catch (error) {
    logger.error({ err: error, guildId: member.guild.id, userId: member.id }, 'Failed to release user');
    return { success: false, message: 'Failed to remove quarantine role.' };
  }
};

export const checkAutoQuarantine = async (
  member: GuildMember,
  config: GuildQuarantineConfigRow
): Promise<{
  triggered: boolean;
  message: string;
}> => {
  if (!config.enabled || !config.auto_quarantine_on_risk) {
    return { triggered: false, message: 'Auto-quarantine disabled.' };
  }

  if (canBypass(member, config)) {
    return { triggered: false, message: 'User bypasses quarantine.' };
  }

  if (isQuarantined(member.guild.id, member.id)) {
    return { triggered: false, message: 'Already quarantined.' };
  }

  const riskLevel = getRiskLevel(member.guild.id, member.id);
  const requiredLevel = RISK_LEVEL_ORDER[config.auto_quarantine_risk_level];
  const currentLevel = RISK_LEVEL_ORDER[riskLevel];

  if (currentLevel < requiredLevel) {
    return { triggered: false, message: `Risk level ${riskLevel} below threshold ${config.auto_quarantine_risk_level}.` };
  }

  const result = await quarantineMember(member, config, `Auto-quarantine: risk level ${riskLevel}`, null);

  return {
    triggered: result.quarantined,
    message: result.message,
  };
};

export const getQuarantineInfo = (
  guildId: string,
  userId: string
): { quarantined: boolean; entry: QuarantineEntry | null } => {
  const entry = quarantineCache.get(getQuarantineKey(guildId, userId));
  if (!entry) return { quarantined: false, entry: null };

  const now = Date.now();
  if (now - entry.quarantinedAt > entry.durationMs) {
    quarantineCache.delete(getQuarantineKey(guildId, userId));
    return { quarantined: false, entry: null };
  }

  return { quarantined: true, entry };
};

export const createQuarantineEmbed = (
  member: GuildMember,
  action: 'QUARANTINE' | 'RELEASE',
  reason: string,
  performedBy: string | null,
  durationSeconds?: number
): EmbedBuilder => {
  const embed = new EmbedBuilder()
    .setTitle(action === 'QUARANTINE' ? 'User Quarantined' : 'User Released')
    .setColor(action === 'QUARANTINE' ? Colors.Orange : Colors.Green)
    .addFields(
      { name: 'User', value: `${member} (${member.id})`, inline: true },
      { name: 'Reason', value: reason || 'No reason provided', inline: true }
    )
    .setTimestamp();

  if (action === 'QUARANTINE' && durationSeconds) {
    embed.addFields({ name: 'Duration', value: `${durationSeconds}s`, inline: true });
  }

  if (performedBy) {
    embed.addFields({ name: 'Performed By', value: `<@${performedBy}>`, inline: true });
  }

  return embed;
};

export const cleanupQuarantineStates = (): void => {
  const now = Date.now();
  for (const [key, entry] of quarantineCache.entries()) {
    if (now - entry.quarantinedAt > entry.durationMs) {
      quarantineCache.delete(key);
    }
  }
};

export const resetQuarantine = (guildId: string, userId: string): void => {
  quarantineCache.delete(getQuarantineKey(guildId, userId));
};
