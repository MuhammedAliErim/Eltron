import { SlashCommandBuilder, EmbedBuilder, version as discordVersion } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import { PermissionGuard } from '../../middleware/PermissionGuard';

export default class BotInfoCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Shows information about the bot.');

  cooldown = 5;

  async execute({ client, interaction }: CommandExecuteOptions): Promise<void> {
    const uptime = Date.now() - client.startTime;
    const days = Math.floor(uptime / 86400000);
    const hours = Math.floor(uptime / 3600000) % 24;
    const minutes = Math.floor(uptime / 60000) % 60;
    const seconds = Math.floor(uptime / 1000) % 60;

    const formatUptime = `${days}d ${hours}h ${minutes}m ${seconds}s`;

    const embed = new EmbedBuilder()
      .setTitle('Eltron Bot - Info')
      .setColor(0x5865f2)
      .addFields(
        { name: 'Guilds', value: `${client.guilds.cache.size}`, inline: true },
        { name: 'Users', value: `${client.users.cache.size}`, inline: true },
        { name: 'Channels', value: `${client.channels.cache.size}`, inline: true },
        { name: 'Uptime', value: formatUptime, inline: true },
        { name: 'Ping', value: `${Math.round(client.ws.ping)}ms`, inline: true },
        { name: 'Commands', value: `${client.commands.size}`, inline: true },
        { name: 'Events', value: `${client.events.size}`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: 'Eltron Bot' });

    if (PermissionGuard.isBotOwner(interaction.user.id)) {
      embed.addFields(
        { name: 'Node.js', value: process.version, inline: true },
        { name: 'Discord.js', value: `v${discordVersion}`, inline: true }
      );
    }

    await interaction.reply({ embeds: [embed] });
  }
}
