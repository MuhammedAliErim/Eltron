import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type GuildMember,
} from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import { StaffRepository } from '../../database/repositories/StaffRepository';
import {
  addStaff,
  removeStaff,
  setStaffStatus,
  promoteStaff,
  demoteStaff,
  getStaffInfo,
} from '../../services/staff/StaffService';
import { StaffRole, StaffStatus } from '../../database/schema';

const repo = new StaffRepository();

const getActorRole = (member: GuildMember): StaffRole => {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return 'MANAGER';
  if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return 'SENIOR_STAFF';
  return 'STAFF';
};

export default class StaffCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('staff')
    .setDescription('Staff management')
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add a staff member')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('User to add').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a staff member')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('User to remove').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription('List staff members')
        .addStringOption((opt) =>
          opt.setName('status')
            .setDescription('Filter by status')
            .setRequired(false)
            .addChoices(
              { name: 'Active', value: 'ACTIVE' },
              { name: 'Inactive', value: 'INACTIVE' },
              { name: 'Suspended', value: 'SUSPENDED' },
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('info')
        .setDescription('Get staff info')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Staff member').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('status')
        .setDescription('Set staff status')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Staff member').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('status')
            .setDescription('New status')
            .setRequired(true)
            .addChoices(
              { name: 'Active', value: 'ACTIVE' },
              { name: 'Inactive', value: 'INACTIVE' },
              { name: 'Suspended', value: 'SUSPENDED' },
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('promote')
        .setDescription('Promote a staff member')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Staff member to promote').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('role')
            .setDescription('New role')
            .setRequired(true)
            .addChoices(
              { name: 'Staff', value: 'STAFF' },
              { name: 'Senior Staff', value: 'SENIOR_STAFF' },
              { name: 'Manager', value: 'MANAGER' },
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('demote')
        .setDescription('Demote a staff member')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Staff member to demote').setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

  category = 'Staff';
  cooldown = 5;

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    await interaction.deferReply({ ephemeral: true });

    const member = interaction.member as GuildMember;
    if (!member) {
      await interaction.editReply({ content: 'Could not identify you as a member.' });
      return;
    }

    const actorRole = getActorRole(member);

    switch (subcommand) {
      case 'add':
        return this.handleAdd(interaction, actorRole);
      case 'remove':
        return this.handleRemove(interaction, actorRole);
      case 'list':
        return this.handleList(interaction);
      case 'info':
        return this.handleInfo(interaction);
      case 'status':
        return this.handleStatus(interaction, actorRole);
      case 'promote':
        return this.handlePromote(interaction, actorRole);
      case 'demote':
        return this.handleDemote(interaction, actorRole);
    }
  }

  private async handleAdd(interaction: ChatInputCommandInteraction, actorRole: StaffRole): Promise<void> {
    const target = interaction.options.getUser('user', true);

    if (target.bot) {
      await interaction.editReply({ content: 'Cannot add bots as staff.' });
      return;
    }

    if (target.id === interaction.user.id) {
      await interaction.editReply({ content: 'Cannot add yourself as staff.' });
      return;
    }

    const result = await addStaff(
      interaction.guildId!,
      target.id,
      interaction.user.id,
      actorRole,
      repo
    );

    await interaction.editReply({ content: result.message });
  }

  private async handleRemove(interaction: ChatInputCommandInteraction, actorRole: StaffRole): Promise<void> {
    const target = interaction.options.getUser('user', true);

    if (target.id === interaction.user.id) {
      await interaction.editReply({ content: 'Cannot remove yourself.' });
      return;
    }

    const result = await removeStaff(
      interaction.guildId!,
      target.id,
      interaction.user.id,
      actorRole,
      repo
    );

    await interaction.editReply({ content: result.message });
  }

  private async handleList(interaction: ChatInputCommandInteraction): Promise<void> {
    const status = interaction.options.getString('status') || undefined;

    const staffList = await repo.listStaff(interaction.guildId!, status);

    if (staffList.length === 0) {
      await interaction.editReply({ content: 'No staff members found.' });
      return;
    }

    const lines = staffList.slice(0, 25).map((s) => {
      const statusIcon = s.status === 'ACTIVE' ? '🟢' : s.status === 'INACTIVE' ? '⚪' : '🔴';
      return `${statusIcon} <@${s.user_id}> — ${s.staff_role} — ${s.status}`;
    });

    await interaction.editReply({ content: lines.join('\n') });
  }

  private async handleInfo(interaction: ChatInputCommandInteraction): Promise<void> {
    const target = interaction.options.getUser('user', true);

    const staff = await repo.getStaff(interaction.guildId!, target.id);
    if (!staff) {
      await interaction.editReply({ content: 'User is not staff.' });
      return;
    }

    const embed = getStaffInfo(staff);
    await interaction.editReply({ embeds: [embed] });
  }

  private async handleStatus(interaction: ChatInputCommandInteraction, actorRole: StaffRole): Promise<void> {
    const target = interaction.options.getUser('user', true);
    const status = interaction.options.getString('status', true) as StaffStatus;

    if (target.id === interaction.user.id) {
      await interaction.editReply({ content: 'Cannot change your own status.' });
      return;
    }

    const result = await setStaffStatus(
      interaction.guildId!,
      target.id,
      status,
      actorRole,
      repo
    );

    await interaction.editReply({ content: result.message });
  }

  private async handlePromote(interaction: ChatInputCommandInteraction, actorRole: StaffRole): Promise<void> {
    const target = interaction.options.getUser('user', true);
    const newRole = interaction.options.getString('role', true) as StaffRole;

    if (target.id === interaction.user.id) {
      await interaction.editReply({ content: 'Cannot promote yourself.' });
      return;
    }

    const result = await promoteStaff(
      interaction.guildId!,
      target.id,
      newRole,
      actorRole,
      repo
    );

    await interaction.editReply({ content: result.message });
  }

  private async handleDemote(interaction: ChatInputCommandInteraction, actorRole: StaffRole): Promise<void> {
    const target = interaction.options.getUser('user', true);

    if (target.id === interaction.user.id) {
      await interaction.editReply({ content: 'Cannot demote yourself.' });
      return;
    }

    const result = await demoteStaff(
      interaction.guildId!,
      target.id,
      actorRole,
      repo
    );

    await interaction.editReply({ content: result.message });
  }
}
