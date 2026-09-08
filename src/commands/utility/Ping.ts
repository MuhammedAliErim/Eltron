import { SlashCommandBuilder, EmbedBuilder, Colors } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';

export default class PingCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Shows the bot latency and API latency.');

  category = 'Utility';
  cooldown = 5;

  async execute({ client, interaction }: CommandExecuteOptions): Promise<void> {
    const before = Date.now();
    const sent = await interaction.deferReply({ fetchReply: true });
    const after = Date.now();

    const botLatency = after - before;
    const apiLatency = Math.round(client.ws.ping);

    const formatLatency = (ms: number): string => {
      if (ms < 100) return `\`${ms}ms\` ✅`;
      if (ms < 200) return `\`${ms}ms\` ⚠️`;
      return `\`${ms}ms\` 🔴`;
    };

    const embed = new EmbedBuilder()
      .setTitle('🏓 Pong!')
      .setColor(Colors.Blurple)
      .addFields(
        { name: 'Bot Latency', value: formatLatency(botLatency), inline: true },
        { name: 'API Latency', value: formatLatency(apiLatency), inline: true },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
}
