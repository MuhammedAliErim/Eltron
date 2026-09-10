import { SlashCommandBuilder, EmbedBuilder, Colors } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';

export default class StatsCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Shows server statistics and analytics.');

  category = 'Utility';
  cooldown = 10;

  async execute({ client, interaction }: CommandExecuteOptions): Promise<void> {
    const guild = interaction.guild!;

    const totalMembers = guild.memberCount;
    const bots = guild.members.cache.filter((m) => m.user.bot).size;
    const humans = totalMembers - bots;
    const online = guild.members.cache.filter(
      (m) => m.presence?.status === 'online' || m.presence?.status === 'idle' || m.presence?.status === 'dnd',
    ).size;

    const embed = new EmbedBuilder()
      .setTitle(`${guild.name} — Statistics`)
      .setColor(Colors.Blurple)
      .setThumbnail(guild.iconURL({ size: 1024 }))
      .addFields(
        { name: 'Total Members', value: `${totalMembers}`, inline: true },
        { name: 'Humans', value: `${humans}`, inline: true },
        { name: 'Bots', value: `${bots}`, inline: true },
        { name: 'Online', value: `${online}`, inline: true },
        { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
        { name: 'Emojis', value: `${guild.emojis.cache.size}`, inline: true },
        { name: 'Channels', value: `${guild.channels.cache.size}`, inline: true },
        { name: 'Boosts', value: `${guild.premiumSubscriptionCount ?? 0}`, inline: true },
        { name: 'Boost Level', value: `${guild.premiumTier}`, inline: true },
      )
      .setTimestamp()
      .setFooter({ text: 'Eltron Bot' });

    await interaction.reply({ embeds: [embed] });
  }
}
