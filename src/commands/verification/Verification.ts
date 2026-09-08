import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  Colors,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import { VerificationRepository } from '../../database/repositories/VerificationRepository';
import { invalidateVerificationConfig } from '../../services/security/VerificationConfig';
import { resetVerification } from '../../services/security/VerificationService';
import { ValidationGuard } from '../../middleware/ValidationGuard';
import { z } from 'zod';
import { GuildVerificationConfigUpdate } from '../../database/schema';

const repo = new VerificationRepository();

const verificationConfigSchema = z.object({
  enabled: z.boolean().optional(),
  verified_role_id: z.string().nullable().optional(),
  unverified_role_id: z.string().nullable().optional(),
  verification_timeout_seconds: z.number().int().min(30).max(3600).optional(),
  max_attempts: z.number().int().min(1).max(10).optional(),
  rate_limit_window_seconds: z.number().int().min(10).max(600).optional(),
  rate_limit_max_attempts: z.number().int().min(1).max(20).optional(),
  log_channel_id: z.string().nullable().optional(),
});

export default class VerificationCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('verification')
    .setDescription('Verification configuration')
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Show current verification status')
    )
    .addSubcommand((sub) =>
      sub
        .setName('enable')
        .setDescription('Enable verification for this server')
    )
    .addSubcommand((sub) =>
      sub
        .setName('disable')
        .setDescription('Disable verification for this server')
    )
    .addSubcommand((sub) =>
      sub
        .setName('config')
        .setDescription('Update verification settings')
        .addStringOption((opt) =>
          opt.setName('setting').setDescription('Setting to update').setRequired(true)
            .addChoices(
              { name: 'verified_role_id', value: 'verified_role_id' },
              { name: 'unverified_role_id', value: 'unverified_role_id' },
              { name: 'verification_timeout_seconds', value: 'verification_timeout_seconds' },
              { name: 'max_attempts', value: 'max_attempts' },
              { name: 'rate_limit_window_seconds', value: 'rate_limit_window_seconds' },
              { name: 'rate_limit_max_attempts', value: 'rate_limit_max_attempts' },
              { name: 'log_channel_id', value: 'log_channel_id' },
            )
        )
        .addStringOption((opt) =>
          opt.setName('value').setDescription('New value').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('reset')
        .setDescription('Reset a user verification state')
        .addStringOption((opt) =>
          opt.setName('user_id').setDescription('User ID to reset').setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

  category = 'Security';
  cooldown = 5;
  requiredPermissions = [PermissionFlagsBits.ManageGuild];

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    await interaction.deferReply({ ephemeral: true });

    switch (subcommand) {
      case 'status':
        return this.handleStatus(interaction);
      case 'enable':
        return this.handleEnable(interaction);
      case 'disable':
        return this.handleDisable(interaction);
      case 'config':
        return this.handleConfig(interaction);
      case 'reset':
        return this.handleReset(interaction);
    }
  }

  private async handleStatus(interaction: ChatInputCommandInteraction): Promise<void> {
    const config = await repo.getOrCreateConfig(interaction.guildId!);

    const embed = new EmbedBuilder()
      .setTitle('Verification Status')
      .setColor(config.enabled ? Colors.Green : Colors.Red)
      .addFields(
        { name: 'Status', value: config.enabled ? 'Enabled' : 'Disabled', inline: true },
        { name: 'Verified Role', value: config.verified_role_id || 'None', inline: true },
        { name: 'Unverified Role', value: config.unverified_role_id || 'None', inline: true },
        { name: 'Timeout', value: `${config.verification_timeout_seconds}s`, inline: true },
        { name: 'Max Attempts', value: `${config.max_attempts}`, inline: true },
        { name: 'Rate Limit', value: `${config.rate_limit_max_attempts} / ${config.rate_limit_window_seconds}s`, inline: true },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }

  private async handleEnable(interaction: ChatInputCommandInteraction): Promise<void> {
    const config = await repo.updateConfig(interaction.guildId!, { enabled: true });
    invalidateVerificationConfig(interaction.guildId!);

    await interaction.editReply({
      content: config ? 'Verification enabled.' : 'Failed to enable verification.',
    });
  }

  private async handleDisable(interaction: ChatInputCommandInteraction): Promise<void> {
    const config = await repo.updateConfig(interaction.guildId!, { enabled: false });
    invalidateVerificationConfig(interaction.guildId!);

    await interaction.editReply({
      content: config ? 'Verification disabled.' : 'Failed to disable verification.',
    });
  }

  private async handleConfig(interaction: ChatInputCommandInteraction): Promise<void> {
    const setting = interaction.options.getString('setting', true);
    const value = interaction.options.getString('value', true);

    const updates: GuildVerificationConfigUpdate = {};

    switch (setting) {
      case 'verified_role_id':
      case 'unverified_role_id':
      case 'log_channel_id':
        updates[setting] = value === 'none' ? null : value;
        break;
      case 'verification_timeout_seconds':
      case 'max_attempts':
      case 'rate_limit_window_seconds':
      case 'rate_limit_max_attempts':
        updates[setting] = parseInt(value, 10);
        break;
    }

    ValidationGuard.validate(verificationConfigSchema, updates);

    const config = await repo.updateConfig(interaction.guildId!, updates);
    invalidateVerificationConfig(interaction.guildId!);

    await interaction.editReply({
      content: config ? `\`${setting}\` updated to \`${value}\`.` : 'Failed to update config.',
    });
  }

  private async handleReset(interaction: ChatInputCommandInteraction): Promise<void> {
    const userId = interaction.options.getString('user_id', true);

    resetVerification(interaction.guildId!, userId);

    await interaction.editReply({
      content: `Verification state reset for user \`${userId}\`.`,
    });
  }
}
