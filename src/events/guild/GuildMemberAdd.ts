import { GuildMember, TextChannel, EmbedBuilder, Colors } from 'discord.js';
import { Event } from '../../structures/Event';
import { EltronClient } from '../../structures/EltronClient';
import { getAntiRaidConfigWithCache } from '../../services/security/AntiRaidConfig';
import {
  processMemberJoin,
  shouldTakeAction,
  getRaidAction,
  getRaidState,
} from '../../services/security/AntiRaidService';
import { AntiRaidRepository } from '../../database/repositories/AntiRaidRepository';
import { getQuarantineConfigWithCache } from '../../services/security/QuarantineConfig';
import { checkAutoQuarantine, createQuarantineEmbed } from '../../services/security/QuarantineService';
import { QuarantineRepository } from '../../database/repositories/QuarantineRepository';
import { WelcomeRepository } from '../../database/repositories/WelcomeRepository';
import { sendWelcome } from '../../services/welcome/WelcomeService';
import { RoleRepository } from '../../database/repositories/RoleRepository';
import { applyAutoRole } from '../../services/role/RoleService';
import { logger } from '../../utils/logger';
import { GuildAntiRaidConfigRow, AntiRaidAction } from '../../database/schema';
import { ModerationService } from '../../services/moderation/ModerationService';
import { recordMemberJoin } from '../../services/analytics/AnalyticsService';

const repo = new AntiRaidRepository();
const quarantineRepo = new QuarantineRepository();
const welcomeRepo = new WelcomeRepository();
const roleRepo = new RoleRepository();

const createMockInteraction = (member: GuildMember) => {
  return {
    guild: member.guild,
    user: member.client.user!,
    member: member.guild.members.me || null,
    client: member.client,
    channel: null,
    replied: false,
    deferred: false,
    followUp: async () => ({}),
    editReply: async () => ({}),
    reply: async () => ({}),
    deferReply: async () => ({}),
    fetchReply: async () => ({}),
    deleteReply: async () => ({}),
    showModal: async () => ({}),
    isChatInputCommand: () => true,
    isButton: () => false,
    isSelectMenu: () => false,
    isModalSubmit: () => false,
    isAutocomplete: () => false,
    options: {
      getUser: () => null,
      getString: () => null,
      getInteger: () => null,
      getBoolean: () => null,
      getSubcommand: () => '',
    },
    memberPermissions: null,
    guildId: member.guild.id,
    channelId: '',
    messageId: '',
    createdTimestamp: Date.now(),
    id: '',
    applicationId: member.client.user?.id || '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
};

const executeRaidAction = async (
  member: GuildMember,
  action: AntiRaidAction,
  reason: string
): Promise<void> => {
  if (action === 'NONE') return;

  const botMember = member.guild.members.me;
  if (!botMember) return;

  if (member.roles.highest.position >= botMember.roles.highest.position) {
    logger.warn({ userId: member.id, guildId: member.guild.id }, 'Anti-raid: cannot act - role hierarchy');
    return;
  }

  if (member.id === member.guild.ownerId) {
    logger.warn({ userId: member.id, guildId: member.guild.id }, 'Anti-raid: cannot act - guild owner');
    return;
  }

  try {
    const mockInteraction = createMockInteraction(member);
    const modService = new ModerationService();

    switch (action) {
      case 'WARN': {
        const modCase = await modService.warn(mockInteraction, member, `Anti-Raid: ${reason}`);
        logger.info({
          guildId: member.guild.id,
          userId: member.id,
          caseId: modCase.case_id,
          action: 'WARN',
        }, 'Anti-raid action applied');
        break;
      }
      case 'TIMEOUT': {
        const durationMs = 10 * 60 * 1000;
        const modCase = await modService.timeout(mockInteraction, member, durationMs, `Anti-Raid: ${reason}`);
        logger.info({
          guildId: member.guild.id,
          userId: member.id,
          caseId: modCase.case_id,
          action: 'TIMEOUT',
        }, 'Anti-raid action applied');
        break;
      }
      case 'KICK': {
        const modCase = await modService.kick(mockInteraction, member, `Anti-Raid: ${reason}`);
        logger.info({
          guildId: member.guild.id,
          userId: member.id,
          caseId: modCase.case_id,
          action: 'KICK',
        }, 'Anti-raid action applied');
        break;
      }
      case 'BAN': {
        const modCase = await modService.ban(mockInteraction, member, `Anti-Raid: ${reason}`);
        logger.info({
          guildId: member.guild.id,
          userId: member.id,
          caseId: modCase.case_id,
          action: 'BAN',
        }, 'Anti-raid action applied');
        break;
      }
    }
  } catch (error) {
    logger.error({ err: error, guildId: member.guild.id, userId: member.id }, 'Anti-raid: failed to execute action');
  }
};

const logRaidDetection = async (
  member: GuildMember,
  config: GuildAntiRaidConfigRow,
  detection: { reason: string; joinCount: number; windowSeconds: number; youngAccountCount: number }
): Promise<void> => {
  try {
    if (!config.log_channel_id) return;

    const channel = member.guild.channels.cache.get(config.log_channel_id);
    if (!channel || !('send' in channel)) return;

    const embed = new EmbedBuilder()
      .setTitle('Anti-Raid Detection')
      .setColor(Colors.Orange)
      .addFields(
        { name: 'User', value: `${member.user.tag} (${member.id})`, inline: true },
        { name: 'Account Age', value: `${Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24))} days`, inline: true },
        { name: 'Reason', value: detection.reason.substring(0, 1024), inline: false },
        { name: 'Join Count', value: `${detection.joinCount} in ${detection.windowSeconds}s`, inline: true },
        { name: 'Young Accounts', value: `${detection.youngAccountCount}`, inline: true },
        { name: 'Raid State', value: getRaidState(member.guild.id), inline: true },
      )
      .setTimestamp();

    await (channel as TextChannel).send({ embeds: [embed] });
  } catch (error) {
    logger.warn({ err: error }, 'Anti-raid: failed to log detection to channel');
  }
};

export default class GuildMemberAddEvent extends Event<'guildMemberAdd'> {
  name = 'guildMemberAdd' as const;

  async execute(client: EltronClient, member: GuildMember): Promise<void> {
    try {
      if (member.user.bot) return;
      if (!member.guild) return;

      const config = await getAntiRaidConfigWithCache(
        member.guild.id,
        (guildId) => repo.getConfig(guildId)
      );

      if (!config.enabled) return;

      const detection = await processMemberJoin(member, config);

      if (!detection.detected) return;

      await logRaidDetection(member, config, detection);

      if (shouldTakeAction(member.guild.id)) {
        const action = getRaidAction(config);
        await executeRaidAction(member, action, detection.reason);
      }
    } catch (error) {
      logger.error({ err: error, guildId: member.guild.id, userId: member.id }, 'Error in GuildMemberAdd anti-raid');
    }

    try {
      const quarantineConfig = await getQuarantineConfigWithCache(
        member.guild.id,
        (guildId) => quarantineRepo.getConfig(guildId)
      );

      if (quarantineConfig.enabled) {
        const result = await checkAutoQuarantine(member, quarantineConfig);
        if (result.triggered) {
          logger.info({ guildId: member.guild.id, userId: member.id }, 'Auto-quarantine triggered on join');
          if (quarantineConfig.log_channel_id) {
            const channel = member.guild.channels.cache.get(quarantineConfig.log_channel_id) as TextChannel | undefined;
            if (channel) {
              const embed = createQuarantineEmbed(member, 'QUARANTINE', 'Auto-quarantine on join (risk scoring)', null, quarantineConfig.quarantine_duration_seconds);
              await channel.send({ embeds: [embed] }).catch(() => {});
            }
          }
        }
      }
    } catch (error) {
      logger.error({ err: error, guildId: member.guild.id, userId: member.id }, 'Error in GuildMemberAdd quarantine');
    }

    try {
      const autoRoleConfig = await roleRepo.getAutoRoleConfig(member.guild.id);
      if (autoRoleConfig.enabled && autoRoleConfig.role_id) {
        await applyAutoRole(member, autoRoleConfig.role_id);
      }
    } catch (error) {
      logger.error({ err: error, guildId: member.guild.id, userId: member.id }, 'Error in GuildMemberAdd auto-role');
    }

    try {
      const welcomeConfig = await welcomeRepo.getConfig(member.guild.id);
      await sendWelcome(member, welcomeConfig);
    } catch (error) {
      logger.error({ err: error, guildId: member.guild.id, userId: member.id }, 'Error in GuildMemberAdd welcome');
    }

    recordMemberJoin(member.guild.id).catch(() => {});
  }
}
