import { SlashCommandBuilder, EmbedBuilder, Colors, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';

export default class RoleInfoCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('roleinfo')
    .setDescription('Get detailed information about a role')
    .addRoleOption((option) =>
      option.setName('role').setDescription('The role to get info about').setRequired(true),
    );

  category = 'Roles';
  cooldown = 5;

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    const roleOption = interaction.options.getRole('role', true);
    const guildRole = interaction.guild?.roles.cache.get(roleOption.id);
    const targetRole = guildRole ?? roleOption;

    const memberCount = interaction.guild?.members.cache.filter(
      (m) => m.roles.cache.has(targetRole.id),
    ).size ?? 0;

    const hexColor = 'hexColor' in targetRole && targetRole.hexColor !== '#000000'
      ? targetRole.hexColor
      : '#010101';

    const createdTimestamp = 'createdTimestamp' in targetRole
      ? Math.floor(targetRole.createdTimestamp / 1000)
      : Math.floor(Date.now() / 1000);

    const permissions = 'permissions' in targetRole && typeof targetRole.permissions === 'object' && 'toArray' in targetRole.permissions
      ? (targetRole.permissions as { toArray(): string[] }).toArray()
      : [];

    const formattedPerms = permissions.length > 0
      ? permissions.map((p: string) => `\`${p}\``).join(', ')
      : 'None';

    const embed = new EmbedBuilder()
      .setTitle(`Role Info — ${targetRole.name}`)
      .setColor(hexColor as `#${string}`)
      .addFields(
        { name: 'Name', value: targetRole.name, inline: true },
        { name: 'ID', value: targetRole.id, inline: true },
        { name: 'Color', value: `\`${hexColor}\``, inline: true },
        { name: 'Position', value: `${targetRole.position ?? 0}`, inline: true },
        { name: 'Hoisted', value: targetRole.hoist ? 'Yes' : 'No', inline: true },
        { name: 'Mentionable', value: targetRole.mentionable ? 'Yes' : 'No', inline: true },
        { name: 'Members', value: `${memberCount}`, inline: true },
        { name: 'Managed', value: targetRole.managed ? 'Yes' : 'No', inline: true },
        { name: 'Created At', value: `<t:${createdTimestamp}:F>`, inline: true },
        { name: 'Permissions', value: formattedPerms.length > 1024 ? formattedPerms.substring(0, 1021) + '...' : formattedPerms, inline: false },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
}
