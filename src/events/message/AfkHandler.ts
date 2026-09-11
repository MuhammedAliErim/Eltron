import { Message, EmbedBuilder, Colors } from 'discord.js';
import { Event } from '../../structures/Event';
import { EltronClient } from '../../structures/EltronClient';
import { checkMessage, checkMention } from '../../services/afk/AfkService';
import { logger } from '../../utils/logger';

export default class AfkHandler extends Event<'messageCreate'> {
  name = 'messageCreate' as const;

  async execute(_client: EltronClient, message: Message): Promise<void> {
    try {
      if (!message.guild) return;
      if (message.author.bot) return;

      const removed = await checkMessage(message);
      if (removed) {
        const embed = new EmbedBuilder()
          .setDescription(`Welcome back! You were AFK for ${removed.duration}.`)
          .setColor(Colors.Green);

        await message.reply({ embeds: [embed] }).catch((error) => {
          logger.warn({ err: error, messageId: message.id }, 'Failed to send AFK removal notice');
        });
      }

      const afkInfo = await checkMention(message);
      if (afkInfo) {
        const embed = new EmbedBuilder()
          .setDescription(`${afkInfo.user} is AFK: ${afkInfo.reason} (for ${afkInfo.duration})`)
          .setColor(Colors.Greyple);

        await message.reply({ embeds: [embed] }).catch((error) => {
          logger.warn({ err: error, messageId: message.id }, 'Failed to send AFK mention notice');
        });
      }
    } catch (error) {
      logger.error({ err: error, messageId: message.id, guildId: message.guildId }, 'Error in AfkHandler');
    }
  }
}
