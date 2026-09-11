import { SlashCommandBuilder, EmbedBuilder, Colors, MessageFlags } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import { getEmojiStats } from '../../services/emoji/EmojiStatsService';

export default class EmojiStatsCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('emojistats')
    .setDescription('Shows emoji statistics for the server');

  category = 'Utility';
  cooldown = 10;

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
      return;
    }

    const stats = getEmojiStats(interaction.guild);

    if (stats.total === 0) {
      const embed = new EmbedBuilder()
        .setTitle(`${interaction.guild.name} — Emoji Statistics`)
        .setDescription('This server has no emojis.')
        .setColor(Colors.Blurple)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    const emojiList = stats.emojis.slice(0, 25).map((e) => {
      const animated = e.animated ? ' (animated)' : '';
      const managed = e.managed ? ' [managed]' : '';
      return `<${e.animated ? 'a' : ''}:${e.name}:${e.id}>${animated}${managed}`;
    });

    const remaining = stats.total - 25;
    const moreText = remaining > 0 ? `\n*...and ${remaining} more*` : '';

    const categoryBreakdown = stats.categories
      .map((c) => `**${c.letter}**: ${c.emojis.length}`)
      .join(', ');

    const embed = new EmbedBuilder()
      .setTitle(`${interaction.guild.name} — Emoji Statistics`)
      .setColor(Colors.Blurple)
      .addFields(
        { name: 'Total Emojis', value: `${stats.total}`, inline: true },
        { name: 'Animated', value: `${stats.animated}`, inline: true },
        { name: 'Static', value: `${stats.static}`, inline: true },
        { name: 'Managed', value: `${stats.managed}`, inline: true },
        { name: 'Custom', value: `${stats.custom}`, inline: true },
        { name: 'Categories', value: categoryBreakdown || 'None', inline: false },
        { name: `Emojis (first 25)`, value: emojiList.join(' ') + moreText || 'None', inline: false },
      )
      .setFooter({ text: `${stats.total} emoji(s) total` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
}
