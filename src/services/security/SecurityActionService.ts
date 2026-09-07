import { Message, TextChannel } from 'discord.js';
import { GuildAutomodConfigRow, AutomodViolation } from '../../database/schema';
import { ModerationService } from '../moderation/ModerationService';
import { logger } from '../../utils/logger';

const formatCaseId = (caseId: number): string => `CASE-${String(caseId).padStart(6, '0')}`;

export const executeSecurityAction = async (
  message: Message,
  violation: AutomodViolation,
  _config: GuildAutomodConfigRow,
  messageDeleted = false
): Promise<void> => {
  const { actionType, reason, shouldDelete } = violation;

  if (shouldDelete && !messageDeleted) {
    try {
      await message.delete();
    } catch (error) {
      logger.warn({ err: error }, 'Failed to delete flagged message');
    }
  }

  await logViolation(message, violation);

  if (!shouldDelete && actionType === 'DELETE') return;

  if (actionType === 'DELETE') return;

  const guild = message.guild;
  if (!guild) return;

  const botMember = guild.members.me;
  if (!botMember) return;

  const targetMember = await guild.members.fetch(message.author.id).catch(() => null);
  if (!targetMember) return;

  if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
    logger.warn({ userId: message.author.id, guildId: guild.id }, 'Cannot punish user: role hierarchy');
    return;
  }

  if (targetMember.id === guild.ownerId) {
    logger.warn({ userId: message.author.id, guildId: guild.id }, 'Cannot punish user: guild owner');
    return;
  }

  try {
    const mockInteraction = createMockInteraction(message);
    const modService = new ModerationService();

    switch (actionType) {
      case 'WARN': {
        const modCase = await modService.warn(mockInteraction, targetMember, `AutoMod: ${reason}`);
        logger.info({
          guildId: guild.id,
          userId: targetMember.id,
          caseId: formatCaseId(modCase.case_id),
          rule: violation.triggerType,
        }, 'AutoMod warn applied');
        break;
      }
      case 'TIMEOUT': {
        const durationMs = 5 * 60 * 1000;
        const modCase = await modService.timeout(mockInteraction, targetMember, durationMs, `AutoMod: ${reason}`);
        logger.info({
          guildId: guild.id,
          userId: targetMember.id,
          caseId: formatCaseId(modCase.case_id),
          rule: violation.triggerType,
        }, 'AutoMod timeout applied');
        break;
      }
      case 'KICK': {
        const modCase = await modService.kick(mockInteraction, targetMember, `AutoMod: ${reason}`);
        logger.info({
          guildId: guild.id,
          userId: targetMember.id,
          caseId: formatCaseId(modCase.case_id),
          rule: violation.triggerType,
        }, 'AutoMod kick applied');
        break;
      }
      case 'BAN': {
        const modCase = await modService.ban(mockInteraction, targetMember, `AutoMod: ${reason}`);
        logger.info({
          guildId: guild.id,
          userId: targetMember.id,
          caseId: formatCaseId(modCase.case_id),
          rule: violation.triggerType,
        }, 'AutoMod ban applied');
        break;
      }
    }
  } catch (error) {
    logger.error({ err: error, guildId: guild.id, userId: message.author.id }, 'Failed to execute automod action');
  }
};

const createMockInteraction = (message: Message) => {
  return {
    guild: message.guild,
    user: message.client.user!,
    member: message.guild?.members.me || null,
    client: message.client,
    channel: message.channel,
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
    guildId: message.guildId,
    channelId: message.channelId,
    messageId: message.id,
    createdTimestamp: Date.now(),
    id: message.id,
    applicationId: message.client.user?.id || '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
};

const logViolation = async (message: Message, violation: AutomodViolation): Promise<void> => {
  try {
    const guild = message.guild;
    if (!guild) return;

    const { getSupabaseAdmin } = await import('../../database/connection');
    const supabase = getSupabaseAdmin();

    await supabase.from('logs').insert({
      guild_id: guild.id,
      channel_id: message.channelId,
      user_id: message.author.id,
      action: `AUTOMOD_${violation.triggerType}`,
      details: {
        rule: violation.triggerType,
        action: violation.actionType,
        reason: violation.reason,
        message_content: message.content.substring(0, 500),
        message_id: message.id,
        channel_name: (message.channel as TextChannel)?.name || 'unknown',
      },
    });
  } catch (error) {
    logger.warn({ err: error }, 'Failed to log automod violation');
  }
};
