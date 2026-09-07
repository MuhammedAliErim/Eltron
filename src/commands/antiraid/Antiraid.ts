import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  Colors,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import { AntiRaidRepository } from '../../database/repositories/AntiRaidRepository';
import { invalidateAntiRaidConfig } from '../../services/security/AntiRaidConfig';
import { getRaidState, resetRaidState, getJoinStats } from '../../services/security/AntiRaidService';
import { ValidationGuard } from '../../middleware/ValidationGuard';
import { z } from 'zod';
import { GuildAntiRaidConfigUpdate, AntiRaidAction } from '../../database/schema';

const repo = new AntiRaidRepository();

const antiraidConfigSchema = z.object({
  enabled: z.boolean().optional(),
  join_rate_limit: z.number().int().min(2).max(100).optional(),
  join_rate_window_seconds: z.number().int().min(1).max(300).optional(),
  account_age_threshold_days: z.number().int().min(1).max(365).optional(),
  burst_threshold: z.number().int().min(2).max(50).optional(),
  burst_window_seconds: z.number().int().min(1).max(60).optional(),
  raid_action: z.enum(['NONE', 'WARN', 'TIMEOUT', 'KICK', 'BAN']).optional(),
  auto_lockdown: z.boolean().optional(),
  lockdown_duration_seconds: z.number().int().min(30).max(3600).optional(),
  log_channel_id: z.string().nullable().optional(),
});

export default class AntiraidCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('antiraid')
    .setDescription('Anti-Raid configuration')
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Show current anti-raid status')
    )
    .addSubcommand((sub) =>
      sub
        .setName('enable')
        .setDescription('Enable anti-raid for this server')
    )
    .addSubcommand((sub) =>
      sub
        .setName('disable')
        .setDescription('Disable anti-raid for this server')
    )
    .addSubcommand((sub) =>
      sub
        .setName('config')
        .setDescription('Update anti-raid settings')
        .addStringOption((opt) =>
          opt.setName('setting').setDescription('Setting to update').setRequired(true)
            .addChoices(
              { name: 'join_rate_limit', value: 'join_rate_limit' },
              { name: 'join_rate_window_seconds', value: 'join_rate_window_seconds' },
              { name: 'account_age_threshold_days', value: 'account_age_threshold_days' },
              { name: 'burst_threshold', value: 'burst_threshold' },
              { name: 'burst_window_seconds', value: 'burst_window_seconds' },
              { name: 'raid_action', value: 'raid_action' },
              { name: 'auto_lockdown', value: 'auto_lockdown' },
              { name: 'lockdown_duration_seconds', value: 'lockdown_duration_seconds' },
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
        .setDescription('Reset raid state to NORMAL')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

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
    const raidState = getRaidState(interaction.guildId!);
    const stats = getJoinStats(interaction.guildId!);

    const embed = new EmbedBuilder()
      .setTitle('Anti-Raid Status')
      .setColor(raidState === 'RAID' ? Colors.Red : raidState === 'SUSPECTED' ? Colors.Orange : Colors.Green)
      .addFields(
        { name: 'Status', value: config.enabled ? 'Enabled' : 'Disabled', inline: true },
        { name: 'Raid State', value: raidState, inline: true },
        { name: 'Join Rate', value: `${config.join_rate_limit} / ${config.join_rate_window_seconds}s`, inline: true },
        { name: 'Burst Threshold', value: `${config.burst_threshold} / ${config.burst_window_seconds}s`, inline: true },
        { name: 'Account Age', value: `<= ${config.account_age_threshold_days} days`, inline: true },
        { name: 'Raid Action', value: config.raid_action, inline: true },
        { name: 'Auto Lockdown', value: config.auto_lockdown ? 'Yes' : 'No', inline: true },
        { name: 'Lockdown Duration', value: `${config.lockdown_duration_seconds}s`, inline: true },
        { name: 'Bypass Roles', value: `${config.bypass_roles.length}`, inline: true },
        { name: 'Bypass Users', value: `${config.bypass_users.length}`, inline: true },
        { name: 'Recent Joins', value: `${stats.total} (${stats.young} young)`, inline: true },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }

  private async handleEnable(interaction: ChatInputCommandInteraction): Promise<void> {
    const config = await repo.updateConfig(interaction.guildId!, { enabled: true });
    invalidateAntiRaidConfig(interaction.guildId!);

    await interaction.editReply({
      content: config ? 'Anti-raid enabled.' : 'Failed to enable anti-raid.',
    });
  }

  private async handleDisable(interaction: ChatInputCommandInteraction): Promise<void> {
    const config = await repo.updateConfig(interaction.guildId!, { enabled: false });
    invalidateAntiRaidConfig(interaction.guildId!);

    await interaction.editReply({
      content: config ? 'Anti-raid disabled.' : 'Failed to disable anti-raid.',
    });
  }

  private async handleConfig(interaction: ChatInputCommandInteraction): Promise<void> {
    const setting = interaction.options.getString('setting', true);
    const value = interaction.options.getString('value', true);

    const updates: GuildAntiRaidConfigUpdate = {};

    switch (setting) {
      case 'raid_action':
        updates.raid_action = value as AntiRaidAction;
        break;
      case 'log_channel_id':
        updates.log_channel_id = value === 'none' ? null : value;
        break;
      case 'auto_lockdown':
        updates.auto_lockdown = value === 'true';
        break;
      case 'join_rate_limit':
      case 'join_rate_window_seconds':
      case 'account_age_threshold_days':
      case 'burst_threshold':
      case 'burst_window_seconds':
      case 'lockdown_duration_seconds':
        updates[setting] = parseInt(value, 10);
        break;
    }

    ValidationGuard.validate(antiraidConfigSchema, updates);

    const config = await repo.updateConfig(interaction.guildId!, updates);
    invalidateAntiRaidConfig(interaction.guildId!);

    await interaction.editReply({
      content: config ? `\`${setting}\` updated to \`${value}\`.` : 'Failed to update config.',
    });
  }

  private async handleReset(interaction: ChatInputCommandInteraction): Promise<void> {
    resetRaidState(interaction.guildId!);

    await interaction.editReply({
      content: 'Raid state reset to NORMAL.',
    });
  }
}
