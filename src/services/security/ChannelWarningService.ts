import { TextChannel, EmbedBuilder, Colors } from 'discord.js';
import { Cache } from '../../utils/cache';
import { GuildChannelWarningConfigRow } from '../../database/schema';
import { logger } from '../../utils/logger';

interface ChannelViolation {
  count: number;
  windowStart: number;
  lastViolation: number;
  currentStep: number;
  lastEscalation: number;
}

const violationCache = new Cache<ChannelViolation>(600000);

const getViolationKey = (guildId: string, channelId: string): string =>
  `cv:${guildId}:${channelId}`;

export const recordViolation = (
  guildId: string,
  channelId: string,
  config: GuildChannelWarningConfigRow
): { escalated: boolean; newSlowmode: number } => {
  const key = getViolationKey(guildId, channelId);
  const now = Date.now();
  const entry = violationCache.get(key);

  if (!entry || now - entry.windowStart > config.escalation_window_seconds * 1000) {
    violationCache.set(key, {
      count: 1,
      windowStart: now,
      lastViolation: now,
      currentStep: 0,
      lastEscalation: 0,
    });
    return { escalated: false, newSlowmode: 0 };
  }

  entry.count++;
  entry.lastViolation = now;
  violationCache.set(key, entry);

  if (entry.count >= config.violation_threshold && entry.currentStep < config.slowmode_escalation_steps.length) {
    const stepIndex = entry.currentStep;
    entry.currentStep++;
    entry.lastEscalation = now;
    violationCache.set(key, entry);

    const slowmode = Math.min(
      config.slowmode_escalation_steps[stepIndex],
      config.max_slowmode_seconds
    );

    logger.info({
      guildId,
      channelId,
      violationCount: entry.count,
      step: stepIndex,
      slowmode,
    }, 'Channel warning escalated');

    return { escalated: true, newSlowmode: slowmode };
  }

  return { escalated: false, newSlowmode: 0 };
};

export const shouldDeescalate = (
  guildId: string,
  channelId: string,
  config: GuildChannelWarningConfigRow
): boolean => {
  const key = getViolationKey(guildId, channelId);
  const entry = violationCache.get(key);
  if (!entry) return false;

  const now = Date.now();
  return (
    entry.currentStep > 0 &&
    now - entry.lastEscalation > config.deescalation_delay_seconds * 1000
  );
};

export const deescalate = (
  guildId: string,
  channelId: string,
  config: GuildChannelWarningConfigRow
): { deescalated: boolean; newSlowmode: number } => {
  const key = getViolationKey(guildId, channelId);
  const entry = violationCache.get(key);
  if (!entry || entry.currentStep === 0) {
    return { deescalated: false, newSlowmode: 0 };
  }

  entry.currentStep = Math.max(0, entry.currentStep - 1);
  entry.lastEscalation = Date.now();
  violationCache.set(key, entry);

  const slowmode = entry.currentStep === 0
    ? 0
    : config.slowmode_escalation_steps[entry.currentStep - 1] || 0;

  logger.info({ guildId, channelId, step: entry.currentStep, slowmode }, 'Channel warning deescalated');

  return { deescalated: true, newSlowmode: slowmode };
};

export const applySlowmode = async (
  channel: TextChannel,
  slowmodeSeconds: number,
  reason: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const oldSlowmode = channel.rateLimitPerUser || 0;

    await channel.setRateLimitPerUser(slowmodeSeconds, reason);

    return {
      success: true,
      message: `Slowmode changed from ${oldSlowmode}s to ${slowmodeSeconds}s.`,
    };
  } catch (error) {
    logger.error({ err: error, channelId: channel.id }, 'Failed to apply slowmode');
    return { success: false, message: 'Failed to set slowmode.' };
  }
};

export const getChannelViolationInfo = (
  guildId: string,
  channelId: string
): ChannelViolation | null => {
  return violationCache.get(getViolationKey(guildId, channelId)) || null;
};

export const resetChannelViolations = (guildId: string, channelId: string): void => {
  violationCache.delete(getViolationKey(guildId, channelId));
};

export const createChannelWarningEmbed = (
  channel: TextChannel,
  action: 'ESCALATE' | 'DEESCALATE' | 'MANUAL',
  oldSlowmode: number,
  newSlowmode: number,
  reason: string,
  performedBy: string | null
): EmbedBuilder => {
  const embed = new EmbedBuilder()
    .setTitle(action === 'ESCALATE' ? 'Channel Warning Escalated' : action === 'DEESCALATE' ? 'Channel Warning Deescalated' : 'Channel Slowmode Changed')
    .setColor(action === 'ESCALATE' ? Colors.Orange : action === 'DEESCALATE' ? Colors.Green : Colors.Blue)
    .addFields(
      { name: 'Channel', value: `${channel}`, inline: true },
      { name: 'Old Slowmode', value: `${oldSlowmode}s`, inline: true },
      { name: 'New Slowmode', value: `${newSlowmode}s`, inline: true },
      { name: 'Reason', value: reason, inline: false },
    )
    .setTimestamp();

  if (performedBy) {
    embed.addFields({ name: 'Performed By', value: `<@${performedBy}>`, inline: true });
  }

  return embed;
};

export const cleanupViolationStates = (): void => {
  const now = Date.now();
  for (const [key, entry] of violationCache.entries()) {
    if (now - entry.windowStart > 600000) {
      violationCache.delete(key);
    }
  }
};
