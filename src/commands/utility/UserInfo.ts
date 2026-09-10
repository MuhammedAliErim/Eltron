import { SlashCommandBuilder, EmbedBuilder, Colors, MessageFlags } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';

export default class UserInfoCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Shows detailed information about a user.')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to get info about.').setRequired(false),
    );

  category = 'Utility';
  cooldown = 5;

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    const targetUser = interaction.options.getUser('user') ?? interaction.user;

    let member = null;
    try {
      member = await interaction.guild!.members.fetch(targetUser.id);
    } catch {
      member = null;
    }

    const createdTimestamp = Math.floor(targetUser.createdTimestamp / 1000);
    const joinedTimestamp = member ? Math.floor(member.joinedTimestamp! / 1000) : null;

    const roles = member
      ? member.roles.cache.filter((r) => r.id !== interaction.guild!.id).sort((a, b) => b.position - a.position)
      : null;

    const highestRole = roles && roles.size > 0 ? roles.first() : null;

    const flags = targetUser.flags?.bitfield
      ? targetUser.flags.toArray().join(', ') || 'None'
      : 'None';

    const embed = new EmbedBuilder()
      .setTitle(`User Info — ${targetUser.tag}`)
      .setColor(Colors.Blurple)
      .setThumbnail(targetUser.displayAvatarURL({ size: 1024 }))
      .addFields(
        { name: 'Username', value: targetUser.username, inline: true },
        { name: 'ID', value: targetUser.id, inline: true },
        { name: 'Bot', value: targetUser.bot ? 'Yes' : 'No', inline: true },
        { name: 'Created At', value: `<t:${createdTimestamp}:F>`, inline: true },
        {
          name: 'Joined Server',
          value: joinedTimestamp ? `<t:${joinedTimestamp}:F>` : 'Unknown',
          inline: true,
        },
        { name: 'Roles', value: roles ? `${roles.size}` : 'N/A', inline: true },
        { name: 'Highest Role', value: highestRole ? highestRole.toString() : 'N/A', inline: true },
        { name: 'Flags', value: flags, inline: false },
      )
      .setTimestamp()
      .setFooter({ text: 'Eltron Bot' });

    await interaction.reply({ embeds: [embed] });
  }
}
