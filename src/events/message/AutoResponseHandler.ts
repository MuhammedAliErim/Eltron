import { Message } from 'discord.js';
import { Event } from '../../structures/Event';
import { EltronClient } from '../../structures/EltronClient';
import { checkMessage } from '../../services/auto-response/AutoResponseService';
import { AutoResponseRepository } from '../../database/repositories/AutoResponseRepository';
import { logger } from '../../utils/logger';

const repo = new AutoResponseRepository();

export default class AutoResponseHandler extends Event<'messageCreate'> {
  name = 'messageCreate' as const;

  async execute(_client: EltronClient, message: Message): Promise<void> {
    try {
      if (!message.guild) return;
      if (message.author.bot) return;

      const matches = await checkMessage(message);

      if (matches.length === 0) return;

      const match = matches[0];

      await repo.incrementUses(match.response.id);

      await message.reply(match.response.response_text).catch((error) => {
        logger.warn({ err: error, messageId: message.id }, 'Failed to send auto response');
      });
    } catch (error) {
      logger.error({ err: error, messageId: message.id, guildId: message.guildId }, 'Error in AutoResponseHandler');
    }
  }
}
