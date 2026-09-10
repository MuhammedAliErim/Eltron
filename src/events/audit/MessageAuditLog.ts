import { Message, PartialMessage, TextChannel } from 'discord.js';
import { Event } from '../../structures/Event';
import { EltronClient } from '../../structures/EltronClient';
import { AuditLogService } from '../../services/audit-log/AuditLogService';
import { logger } from '../../utils/logger';

export default class MessageDeleteAuditLog extends Event<'messageDelete'> {
  name = 'messageDelete' as const;

  async execute(client: EltronClient, message: Message | PartialMessage): Promise<void> {
    if (!message.guild) return;
    if (!message.author) return;
    if (message.author.bot) return;
    if (!message.content) return;
    if (!(message.channel instanceof TextChannel)) return;

    try {
      await AuditLogService.logMessageDelete(
        message.guild.id,
        message.channel.id,
        message.author.id,
        message.content
      );
    } catch (error) {
      logger.error({ err: error, guildId: message.guild.id, messageId: message.id }, 'Failed to log message delete audit');
    }
  }
}

export class MessageEditAuditLog extends Event<'messageUpdate'> {
  name = 'messageUpdate' as const;

  async execute(client: EltronClient, oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage): Promise<void> {
    if (!oldMessage.guild) return;
    if (!oldMessage.author) return;
    if (oldMessage.author.bot) return;
    if (!(oldMessage.channel instanceof TextChannel)) return;

    const oldContent = oldMessage.content;
    const newContent = newMessage.content;

    if (!oldContent || !newContent) return;
    if (oldContent === newContent) return;

    try {
      await AuditLogService.logMessageEdit(
        oldMessage.guild.id,
        oldMessage.channel.id,
        oldMessage.author.id,
        oldContent,
        newContent
      );
    } catch (error) {
      logger.error({ err: error, guildId: oldMessage.guild.id, messageId: oldMessage.id }, 'Failed to log message edit audit');
    }
  }
}
