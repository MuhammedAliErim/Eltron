import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import { RoleRepository } from '../../database/repositories/RoleRepository';
import { canBotManageRole } from '../../services/role/RoleService';

const repo = new RoleRepository();

export default class AutoRoleCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('autorole')
    .setDescription('Auto-role configuration')
    .addSubcommand((sub) =>
      sub.setName('enable').setDescription('Enable auto-role')
    )
    .addSubcommand((sub) =>
      sub.setName('disable').setDescription('Disable auto-role')
    )
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('View auto-role status')
    )
    .addSubcommand((sub) =>
      sub
        .setName('set')
        .setDescription('Set auto-role')
        .addRoleOption((opt) =>
          opt.setName('role').setDescription('Role to assign on join').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('reset').setDescription('Reset auto-role configuration')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

  category = 'Server Management';
  cooldown = 3;

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    switch (subcommand) {
      case 'enable':
        return this.handleEnable(interaction, guildId);
      case 'disable':
        return this.handleDisable(interaction, guildId);
      case 'status':
        return this.handleStatus(interaction, guildId);
      case 'set':
        return this.handleSet(interaction, guildId);
      case 'reset':
        return this.handleReset(interaction, guildId);
    }
  }

  private async handleEnable(
    interaction: ChatInputCommandInteraction,
    guildId: string
  ): Promise<void> {
    const config = await repo.getAutoRoleConfig(guildId);

    if (!config.role_id) {
      await interaction.editReply({
        content: 'Set an auto-role first with `/autorole set`.',
      });
      return;
    }

    const role = interaction.guild!.roles.cache.get(config.role_id);
    if (!role) {
      await interaction.editReply({
        content: 'Configured role no longer exists. Use `/autorole set` to set a new one.',
      });
      return;
    }

    if (!canBotManageRole(interaction.guild!, role)) {
      await interaction.editReply({
        content: 'Cannot enable auto-role for this role (hierarchy or permissions).',
      });
      return;
    }

    await repo.upsertAutoRoleConfig(guildId, { enabled: true });
    await interaction.editReply({ content: 'Auto-role enabled.' });
  }

  private async handleDisable(
    interaction: ChatInputCommandInteraction,
    guildId: string
  ): Promise<void> {
    await repo.upsertAutoRoleConfig(guildId, { enabled: false });
    await interaction.editReply({ content: 'Auto-role disabled.' });
  }

  private async handleStatus(
    interaction: ChatInputCommandInteraction,
    guildId: string
  ): Promise<void> {
    const config = await repo.getAutoRoleConfig(guildId);

    const enabled = config.enabled ? 'Enabled' : 'Disabled';
    const role = config.role_id ? `<@&${config.role_id}>` : 'Not set';

    await interaction.editReply({
      content: `**Auto-Role:** ${enabled}\n**Role:** ${role}`,
    });
  }

  private async handleSet(
    interaction: ChatInputCommandInteraction,
    guildId: string
  ): Promise<void> {
    const option = interaction.options.getRole('role', true);
    const role = interaction.guild!.roles.cache.get(option.id);

    if (!role) {
      await interaction.editReply({ content: 'Role not found.' });
      return;
    }

    if (!canBotManageRole(interaction.guild!, role)) {
      await interaction.editReply({
        content: 'Cannot use this role for auto-role (hierarchy or permissions).',
      });
      return;
    }

    await repo.upsertAutoRoleConfig(guildId, { role_id: role.id });
    await interaction.editReply({
      content: `Auto-role set to <@&${role.id}>.`,
    });
  }

  private async handleReset(
    interaction: ChatInputCommandInteraction,
    guildId: string
  ): Promise<void> {
    await repo.resetAutoRoleConfig(guildId);
    await interaction.editReply({ content: 'Auto-role configuration reset.' });
  }
}
