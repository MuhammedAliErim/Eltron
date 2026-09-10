import { SlashCommandBuilder, EmbedBuilder, Colors } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';

export default class UptimeCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('uptime')
    .setDescription('Shows the bot uptime.');

  category = 'Utility';
  cooldown = 5;

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    const totalSeconds = Math.floor(process.uptime());
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const formatted = [
      days > 0 ? `${days}d` : null,
      hours > 0 ? `${hours}h` : null,
      minutes > 0 ? `${minutes}m` : null,
      `${seconds}s`,
    ]
      .filter(Boolean)
      .join(' ');

    const embed = new EmbedBuilder()
      .setTitle('Uptime')
      .setColor(Colors.Blurple)
      .setDescription(`The bot has been online for **${formatted}**.`)
      .setTimestamp()
      .setFooter({ text: 'Eltron Bot' });

    await interaction.reply({ embeds: [embed] });
  }
}
