import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type GuildMember,
  type Role,
} from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import {
  canBotManageRole,
  canMemberManageRole,
  validateRoleName,
  validateHexColor,
  parseHexColor,
  createRoleInfoEmbed,
} from '../../services/role/RoleService';

const resolveRole = (interaction: ChatInputCommandInteraction): Role | null => {
  const option = interaction.options.getRole('role', true);
  return interaction.guild!.roles.cache.get(option.id) ?? null;
};

export default class RoleCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('role')
    .setDescription('Role management')
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Create a role')
        .addStringOption((opt) =>
          opt.setName('name').setDescription('Role name').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('delete')
        .setDescription('Delete a role')
        .addRoleOption((opt) =>
          opt.setName('role').setDescription('Role to delete').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('rename')
        .setDescription('Rename a role')
        .addRoleOption((opt) =>
          opt.setName('role').setDescription('Role to rename').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('name').setDescription('New name').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('color')
        .setDescription('Change role color')
        .addRoleOption((opt) =>
          opt.setName('role').setDescription('Role to change').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('color').setDescription('Hex color (e.g. #FF0000)').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('hoist')
        .setDescription('Toggle role hoist')
        .addRoleOption((opt) =>
          opt.setName('role').setDescription('Role to toggle').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('mentionable')
        .setDescription('Toggle role mentionable')
        .addRoleOption((opt) =>
          opt.setName('role').setDescription('Role to toggle').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('info')
        .setDescription('View role information')
        .addRoleOption((opt) =>
          opt.setName('role').setDescription('Role to inspect').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('List all guild roles')
    )
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add role to member')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Target member').setRequired(true)
        )
        .addRoleOption((opt) =>
          opt.setName('role').setDescription('Role to add').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove role from member')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Target member').setRequired(true)
        )
        .addRoleOption((opt) =>
          opt.setName('role').setDescription('Role to remove').setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

  category = 'Server Management';
  cooldown = 3;

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'create':
        return this.handleCreate(interaction);
      case 'delete':
        return this.handleDelete(interaction);
      case 'rename':
        return this.handleRename(interaction);
      case 'color':
        return this.handleColor(interaction);
      case 'hoist':
        return this.handleHoist(interaction);
      case 'mentionable':
        return this.handleMentionable(interaction);
      case 'info':
        return this.handleInfo(interaction);
      case 'list':
        return this.handleList(interaction);
      case 'add':
        return this.handleAdd(interaction);
      case 'remove':
        return this.handleRemove(interaction);
    }
  }

  private async handleCreate(interaction: ChatInputCommandInteraction): Promise<void> {
    const name = interaction.options.getString('name', true);

    const error = validateRoleName(name);
    if (error) {
      await interaction.editReply({ content: error });
      return;
    }

    try {
      const role = await interaction.guild!.roles.create({
        name,
        reason: `Created by ${interaction.user.tag}`,
      });

      await interaction.editReply({ content: `Role <@&${role.id}> created.` });
    } catch {
      await interaction.editReply({ content: 'Failed to create role. Check bot permissions.' });
    }
  }

  private async handleDelete(interaction: ChatInputCommandInteraction): Promise<void> {
    const role = resolveRole(interaction);
    if (!role) {
      await interaction.editReply({ content: 'Role not found.' });
      return;
    }

    if (!canBotManageRole(interaction.guild!, role)) {
      await interaction.editReply({ content: 'Cannot delete this role (hierarchy or permissions).' });
      return;
    }

    try {
      await role.delete(`Deleted by ${interaction.user.tag}`);
      await interaction.editReply({ content: `Role "${role.name}" deleted.` });
    } catch {
      await interaction.editReply({ content: 'Failed to delete role.' });
    }
  }

  private async handleRename(interaction: ChatInputCommandInteraction): Promise<void> {
    const role = resolveRole(interaction);
    if (!role) {
      await interaction.editReply({ content: 'Role not found.' });
      return;
    }

    const name = interaction.options.getString('name', true);

    const error = validateRoleName(name);
    if (error) {
      await interaction.editReply({ content: error });
      return;
    }

    if (!canBotManageRole(interaction.guild!, role)) {
      await interaction.editReply({ content: 'Cannot modify this role (hierarchy or permissions).' });
      return;
    }

    try {
      await role.setName(name, `Renamed by ${interaction.user.tag}`);
      await interaction.editReply({ content: `Role renamed to "${name}".` });
    } catch {
      await interaction.editReply({ content: 'Failed to rename role.' });
    }
  }

  private async handleColor(interaction: ChatInputCommandInteraction): Promise<void> {
    const role = resolveRole(interaction);
    if (!role) {
      await interaction.editReply({ content: 'Role not found.' });
      return;
    }

    const color = interaction.options.getString('color', true);

    if (!validateHexColor(color)) {
      await interaction.editReply({ content: 'Invalid hex color. Use format: #FF0000 or FF0000.' });
      return;
    }

    if (!canBotManageRole(interaction.guild!, role)) {
      await interaction.editReply({ content: 'Cannot modify this role (hierarchy or permissions).' });
      return;
    }

    try {
      await role.setColor(parseHexColor(color), `Color changed by ${interaction.user.tag}`);
      await interaction.editReply({ content: `Role color updated to ${color}.` });
    } catch {
      await interaction.editReply({ content: 'Failed to change role color.' });
    }
  }

  private async handleHoist(interaction: ChatInputCommandInteraction): Promise<void> {
    const role = resolveRole(interaction);
    if (!role) {
      await interaction.editReply({ content: 'Role not found.' });
      return;
    }

    if (!canBotManageRole(interaction.guild!, role)) {
      await interaction.editReply({ content: 'Cannot modify this role (hierarchy or permissions).' });
      return;
    }

    try {
      await role.setHoist(!role.hoist, `Hoist toggled by ${interaction.user.tag}`);
      await interaction.editReply({
        content: `Role hoist ${role.hoist ? 'disabled' : 'enabled'}.`,
      });
    } catch {
      await interaction.editReply({ content: 'Failed to toggle hoist.' });
    }
  }

  private async handleMentionable(interaction: ChatInputCommandInteraction): Promise<void> {
    const role = resolveRole(interaction);
    if (!role) {
      await interaction.editReply({ content: 'Role not found.' });
      return;
    }

    if (!canBotManageRole(interaction.guild!, role)) {
      await interaction.editReply({ content: 'Cannot modify this role (hierarchy or permissions).' });
      return;
    }

    try {
      await role.setMentionable(!role.mentionable, `Mentionable toggled by ${interaction.user.tag}`);
      await interaction.editReply({
        content: `Role mentionable ${role.mentionable ? 'disabled' : 'enabled'}.`,
      });
    } catch {
      await interaction.editReply({ content: 'Failed to toggle mentionable.' });
    }
  }

  private async handleInfo(interaction: ChatInputCommandInteraction): Promise<void> {
    const role = resolveRole(interaction);
    if (!role) {
      await interaction.editReply({ content: 'Role not found.' });
      return;
    }

    const embed = createRoleInfoEmbed(role);
    await interaction.editReply({ embeds: [embed] });
  }

  private async handleList(interaction: ChatInputCommandInteraction): Promise<void> {
    const roles = interaction.guild!.roles.cache
      .filter((r) => r.id !== interaction.guild!.id)
      .sort((a, b) => b.position - a.position)
      .first(25);

    if (!roles || roles.length === 0) {
      await interaction.editReply({ content: 'No roles found.' });
      return;
    }

    const lines = roles.map((r) => `<@&${r.id}> — ${r.members.size} members`);
    await interaction.editReply({ content: lines.join('\n') });
  }

  private async handleAdd(interaction: ChatInputCommandInteraction): Promise<void> {
    const target = interaction.options.getUser('user', true);
    const role = resolveRole(interaction);

    if (!role) {
      await interaction.editReply({ content: 'Role not found.' });
      return;
    }

    const member = await interaction.guild!.members.fetch(target.id).catch(() => null);

    if (!member) {
      await interaction.editReply({ content: 'Member not found.' });
      return;
    }

    if (!canBotManageRole(interaction.guild!, role)) {
      await interaction.editReply({ content: 'Cannot assign this role (hierarchy or permissions).' });
      return;
    }

    if (!canMemberManageRole(interaction.member as GuildMember, role)) {
      await interaction.editReply({ content: 'You cannot assign this role (insufficient permissions).' });
      return;
    }

    if (member.roles.cache.has(role.id)) {
      await interaction.editReply({ content: 'Member already has this role.' });
      return;
    }

    try {
      await member.roles.add(role, `Added by ${interaction.user.tag}`);
      await interaction.editReply({ content: `Role <@&${role.id}> added to <@${target.id}>.` });
    } catch {
      await interaction.editReply({ content: 'Failed to add role.' });
    }
  }

  private async handleRemove(interaction: ChatInputCommandInteraction): Promise<void> {
    const target = interaction.options.getUser('user', true);
    const role = resolveRole(interaction);

    if (!role) {
      await interaction.editReply({ content: 'Role not found.' });
      return;
    }

    const member = await interaction.guild!.members.fetch(target.id).catch(() => null);

    if (!member) {
      await interaction.editReply({ content: 'Member not found.' });
      return;
    }

    if (!canBotManageRole(interaction.guild!, role)) {
      await interaction.editReply({ content: 'Cannot remove this role (hierarchy or permissions).' });
      return;
    }

    if (!canMemberManageRole(interaction.member as GuildMember, role)) {
      await interaction.editReply({ content: 'You cannot remove this role (insufficient permissions).' });
      return;
    }

    if (!member.roles.cache.has(role.id)) {
      await interaction.editReply({ content: 'Member does not have this role.' });
      return;
    }

    try {
      await member.roles.remove(role, `Removed by ${interaction.user.tag}`);
      await interaction.editReply({ content: `Role <@&${role.id}> removed from <@${target.id}>.` });
    } catch {
      await interaction.editReply({ content: 'Failed to remove role.' });
    }
  }
}
