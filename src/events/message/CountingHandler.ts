import { Message, EmbedBuilder, Colors } from 'discord.js';
import { Event } from '../../structures/Event';
import { EltronClient } from '../../structures/EltronClient';
import { handleMessage } from '../../services/counting/CountingService';
import { logger } from '../../utils/logger';

export default class CountingHandler extends Event<'messageCreate'> {
  name = 'messageCreate' as const;

  async execute(_client: EltronClient, message: Message): Promise<void> {
    try {
      if (!message.guild) return;
      if (message.author.bot) return;

      const result = await handleMessage(message);
      if (!result.valid) return;

      if (result.correct) {
        await message.react('✅').catch(() => {});

        const embed = new EmbedBuilder()
          .setDescription(`**${result.currentNumber}** - Correct!`)
          .setColor(Colors.Green);

        if (result.score) {
          embed.setFooter({
            text: `Streak: ${result.score.streak} | Best: ${result.score.bestStreak} | Total: ${result.score.correctCount}`,
          });
        }

        if (result.milestone) {
          embed.addFields({
            name: '🎉 Milestone Reached!',
            value: `The server reached **${result.milestone}**!`,
          });
        }

        await message.reply({ embeds: [embed] }).catch(() => {});
      } else {
        await message.react('❌').catch(() => {});

        const embed = new EmbedBuilder()
          .setDescription(
            `**${message.content}** is not the right number! The next number was **${result.expectedNumber}**.`
          )
          .setColor(Colors.Red);

        if (result.currentNumber === 0) {
          embed.addFields({ name: 'Count Reset', value: 'The count has been reset to 0.' });
        }

        await message.reply({ embeds: [embed] }).catch(() => {});
      }
    } catch (error) {
      logger.error({ err: error, messageId: message.id, guildId: message.guildId }, 'Error in CountingHandler');
    }
  }
}
