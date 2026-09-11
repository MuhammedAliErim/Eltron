import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder, Colors } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';

export default class MassRoleCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('massrole')
    .setDescription('Add or remove a role from all members')
    .addSubcommand(sub =>
      sub.setName('add').setDescription('Add role to all members')
        .addRoleOption(opt => opt.setName('role').setDescription('The role to add').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('remove').setDescription('Remove role from all members')
        .addRoleOption(opt => opt.setName('role').setDescription('The role to remove').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('check').setDescription('Check how many members have the role')
        .addRoleOption(opt => opt.setName('role').setDescription('The role to check').setRequired(true))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);

  category = 'Roles';
  cooldown = 30;
  requiredPermissions = [PermissionFlagsBits.ManageRoles];

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({ content: '❌ This command can only be used in a server.', flags: MessageFlags.Ephemeral });
      return;
    }

    const role = interaction.options.getRole('role', true);
    const subcommand = interaction.options.getSubcommand();

    const botMember = await interaction.guild.members.fetchMe();
    if (!botMember) {
      await interaction.reply({ content: '❌ Bot member not found.', flags: MessageFlags.Ephemeral });
      return;
    }

    if (role.position >= botMember.roles.highest.position) {
      await interaction.reply({ content: '❌ I cannot manage this role. My highest role must be above the target role.', flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const allMembers = await interaction.guild.members.fetch({ withGuild: true });
    const members = allMembers.filter(m => !m.user.bot);

    if (subcommand === 'check') {
      const withRole = members.filter(m => m.roles.cache.has(role.id)).size;
      const withoutRole = members.size - withRole;

      const embed = new EmbedBuilder()
        .setTitle(`📊 Role Check: ${role.name}`)
        .setColor(role.hexColor === '#000000' ? Colors.Blurple : role.hexColor)
        .addFields(
          { name: 'Members with role', value: `${withRole}`, inline: true },
          { name: 'Members without role', value: `${withoutRole}`, inline: true },
          { name: 'Total members', value: `${members.size}`, inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    let success = 0;
    let failed = 0;
    const targetMembers = subcommand === 'add'
      ? members.filter(m => !m.roles.cache.has(role.id))
      : members.filter(m => m.roles.cache.has(role.id));

    if (targetMembers.size === 0) {
      await interaction.editReply({
        content: subcommand === 'add'
          ? '✅ All members already have this role.'
          : '✅ No members have this role.'
      });
      return;
    }

    const total = targetMembers.size;
    await interaction.editReply({
      content: `⏳ Processing ${subcommand === 'add' ? 'adding' : 'removing'} role for **${total}** members...`
    });

    for (const [, member] of targetMembers) {
      try {
        if (subcommand === 'add') {
          await member.roles.add(role.id, 'Mass role add');
        } else {
          await member.roles.remove(role.id, 'Mass role remove');
        }
        success++;
      } catch {
        failed++;
      }
      await new Promise(r => setTimeout(r, 100));
    }

    const embed = new EmbedBuilder()
      .setTitle(`✅ Mass ${subcommand === 'add' ? 'Add' : 'Remove'} Complete`)
      .setColor(Colors.Green)
      .addFields(
        { name: 'Role', value: role.name, inline: true },
        { name: 'Success', value: `${success}`, inline: true },
        { name: 'Failed', value: `${failed}`, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
}
