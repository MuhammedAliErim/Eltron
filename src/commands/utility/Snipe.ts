import { SlashCommandBuilder, EmbedBuilder, Colors } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';

interface SnipeData {
  content: string;
  author: string;
  authorAvatar: string | null;
  timestamp: number;
  deletedAt: number;
}

const snipeStore = new Map<string, SnipeData>();

export function recordSnipe(channelId: string, data: SnipeData): void {
  snipeStore.set(channelId, data);
}

export function getSnipe(channelId: string): SnipeData | undefined {
  return snipeStore.get(channelId);
}

export default class SnipeCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('snipe')
    .setDescription('Shows the last deleted message in the current channel.');

  category = 'Utility';
  cooldown = 5;

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    const snipe = getSnipe(interaction.channelId);

    if (!snipe) {
      await interaction.reply({ content: 'No recently deleted messages found in this channel.', flags: 64 });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(Colors.Blurple)
      .setAuthor({ name: snipe.author, iconURL: snipe.authorAvatar || undefined })
      .setDescription(snipe.content.length > 1000 ? snipe.content.slice(0, 1000) + '...' : snipe.content)
      .addFields(
        { name: 'Original Message', value: `<t:${Math.floor(snipe.timestamp / 1000)}:R>`, inline: true },
        { name: 'Deleted', value: `<t:${Math.floor(snipe.deletedAt / 1000)}:R>`, inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
}
