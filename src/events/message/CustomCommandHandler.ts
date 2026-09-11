import { Message } from 'discord.js';
import { Event } from '../../structures/Event';
import { EltronClient } from '../../structures/EltronClient';
import { processCommand } from '../../services/custom-command/CustomCommandService';
import { logger } from '../../utils/logger';

const PREFIXES = ['!', '?'];

export default class CustomCommandHandler extends Event<'messageCreate'> {
  name = 'messageCreate' as const;

  async execute(_client: EltronClient, message: Message): Promise<void> {
    try {
      if (!message.guild) return;
      if (message.author.bot) return;
      if (message.webhookId) return;

      const content = message.content;
      const matchedPrefix = PREFIXES.find((p) => content.startsWith(p));

      if (!matchedPrefix) return;

      const args = content.slice(matchedPrefix.length).trim().split(/\s+/);

      if (args.length === 0) return;

      const result = await processCommand(message, args);

      if (!result) return;

      if (result.dmResponse) {
        await message.author.send(result.response).catch((error) => {
          logger.warn({ err: error, userId: message.author.id }, 'Failed to send DM response');
        });
      } else {
        await message.reply(result.response).catch((error) => {
          logger.warn({ err: error, messageId: message.id }, 'Failed to send custom command response');
        });
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('cooldown')) {
        await message.reply(error.message).catch(() => {});
        return;
      }
      if (error instanceof Error && error.message.includes('permission')) {
        await message.reply(error.message).catch(() => {});
        return;
      }
      logger.error({ err: error, messageId: message.id, guildId: message.guildId }, 'Error in CustomCommandHandler');
    }
  }
}
