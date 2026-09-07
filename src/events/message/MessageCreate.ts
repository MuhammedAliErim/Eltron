import { Message, TextChannel } from 'discord.js';
import { Event } from '../../structures/Event';
import { EltronClient } from '../../structures/EltronClient';
import { getConfigWithCache } from '../../services/security/AutomodConfig';
import { checkMessage } from '../../services/security/AntiSpamService';
import { executeSecurityAction } from '../../services/security/SecurityActionService';
import { AutomodRepository } from '../../database/repositories/AutomodRepository';
import { getChannelWarningConfigWithCache } from '../../services/security/ChannelWarningConfig';
import { recordViolation, applySlowmode, createChannelWarningEmbed } from '../../services/security/ChannelWarningService';
import { ChannelWarningRepository } from '../../database/repositories/ChannelWarningRepository';
import { LevelRepository } from '../../database/repositories/LevelRepository';
import { handleMessageXP } from '../../services/level/LevelService';
import { logger } from '../../utils/logger';
import { recordMessage } from '../../services/analytics/AnalyticsService';

const repo = new AutomodRepository();
const channelWarningRepo = new ChannelWarningRepository();
const levelRepo = new LevelRepository();

export default class MessageCreateEvent extends Event<'messageCreate'> {
  name = 'messageCreate' as const;

  async execute(client: EltronClient, message: Message): Promise<void> {
    try {
      if (!message.guild) return;
      if (message.author.bot) return;
      if (message.webhookId) return;
      if (message.system) return;

      const config = await getConfigWithCache(
        message.guildId!,
        (guildId) => repo.getConfig(guildId)
      );

      if (!config.enabled) return;

      const result = await checkMessage(message, config);

      if (result.violations.length === 0) return;

      let messageDeleted = false;
      for (const violation of result.violations) {
        await executeSecurityAction(message, violation, config, messageDeleted);
        if (violation.shouldDelete) messageDeleted = true;
      }

      const hasSpamViolation = result.violations.some(
        (v) => v.triggerType === 'FLOOD' || v.triggerType === 'DUPLICATE_MESSAGE' || v.triggerType === 'MENTION_SPAM' || v.triggerType === 'CAPS_SPAM'
      );

      if (hasSpamViolation && message.channel && 'rateLimitPerUser' in message.channel) {
        try {
          const cwConfig = await getChannelWarningConfigWithCache(
            message.guildId!,
            (guildId) => channelWarningRepo.getConfig(guildId)
          );

          if (cwConfig.enabled && cwConfig.auto_warning_on_spam) {
            const result = recordViolation(message.guildId!, message.channel.id, cwConfig);
            if (result.escalated) {
              const channel = message.channel as TextChannel;
              const oldSlowmode = channel.rateLimitPerUser || 0;
              const applyResult = await applySlowmode(channel, result.newSlowmode, 'Auto channel warning: spam detected');
              if (applyResult.success) {
                await channelWarningRepo.logAction(
                  message.guildId!,
                  message.channel.id,
                  'ESCALATE',
                  oldSlowmode,
                  result.newSlowmode,
                  'Auto channel warning: spam detected',
                  null
                );
                if (cwConfig.log_channel_id) {
                  const logChannel = message.guild?.channels.cache.get(cwConfig.log_channel_id) as TextChannel | undefined;
                  if (logChannel) {
                    const embed = createChannelWarningEmbed(channel, 'ESCALATE', oldSlowmode, result.newSlowmode, 'Auto channel warning: spam detected', null);
                    await logChannel.send({ embeds: [embed] }).catch(() => {});
                  }
                }
              }
            }
          }
        } catch (error) {
          logger.warn({ err: error }, 'Channel warning escalation failed');
        }
      }
    } catch (error) {
      logger.error({ err: error, messageId: message.id, guildId: message.guildId }, 'Error in MessageCreate automod');
    }

    try {
      await handleMessageXP(message, levelRepo);
    } catch (error) {
      logger.error({ err: error, messageId: message.id, guildId: message.guildId }, 'Error in MessageCreate XP');
    }

    recordMessage(message.guildId!).catch(() => {});
  }
}
