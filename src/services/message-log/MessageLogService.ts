import type { Message, PartialMessage } from 'discord.js';
import { MessageLogRepository } from '../../database/repositories/MessageLogRepository';
import { logger } from '../../utils/logger';

const repo = new MessageLogRepository();

export class MessageLogService {
  static async logEdit(message: Message | PartialMessage, oldContent: string): Promise<void> {
    try {
      if (!message.guild) return;
      if (!message.author) return;
      if (message.author.bot) return;
      if (!message.channel.isTextBased()) return;
      if (!message.content) return;
      if (oldContent === message.content) return;

      await repo.log({
        guild_id: message.guild.id,
        channel_id: message.channel.id,
        message_id: message.id,
        author_id: message.author.id,
        action: 'edit',
        old_content: oldContent.substring(0, 2000),
        new_content: message.content.substring(0, 2000),
      });
    } catch (error) {
      logger.error({ err: error, messageId: message.id }, 'Failed to log message edit');
    }
  }

  static async logDelete(message: Message | PartialMessage): Promise<void> {
    try {
      if (!message.guild) return;
      if (!message.author) return;
      if (message.author.bot) return;
      if (!message.channel.isTextBased()) return;
      if (!message.content) return;

      await repo.log({
        guild_id: message.guild.id,
        channel_id: message.channel.id,
        message_id: message.id,
        author_id: message.author.id,
        action: 'delete',
        old_content: message.content.substring(0, 2000),
      });
    } catch (error) {
      logger.error({ err: error, messageId: message.id }, 'Failed to log message delete');
    }
  }

  static async getLogs(guildId: string, options: {
    action?: string;
    authorId?: string;
    channelId?: string;
    page?: number;
    limit?: number;
  } = {}) {
    return repo.getByGuild(guildId, options);
  }

  static async searchLogs(guildId: string, query: string, authorId?: string, page?: number, limit?: number) {
    return repo.search(guildId, query, authorId, page, limit);
  }

  static async getRecentLogs(guildId: string, limit?: number) {
    return repo.getRecent(guildId, limit);
  }
}
