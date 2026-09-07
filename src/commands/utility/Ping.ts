import { SlashCommandBuilder } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';

export default class PingCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Shows the bot latency and API latency.');

  cooldown = 5;

  async execute({ client, interaction }: CommandExecuteOptions): Promise<void> {
    const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });

    const botLatency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(client.ws.ping);

    const formatLatency = (ms: number): string => {
      if (ms < 100) return `\`${ms}ms\` Good`;
      if (ms < 200) return `\`${ms}ms\` Normal`;
      return `\`${ms}ms\` Slow`;
    };

    await interaction.editReply({
      content: [
        '**Pong!**',
        '',
        `**Bot Latency:** ${formatLatency(botLatency)}`,
        `**API Latency:** ${formatLatency(apiLatency)}`,
      ].join('\n'),
    });
  }
}
