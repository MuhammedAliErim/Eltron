import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  Colors,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import { QuarantineRepository } from '../../database/repositories/QuarantineRepository';
import { invalidateQuarantineConfig } from '../../services/security/QuarantineConfig';
import {
  quarantineMember,
  releaseMember,
  getQuarantineInfo,
  createQuarantineEmbed,
} from '../../services/security/QuarantineService';
import { ValidationGuard } from '../../middleware/ValidationGuard';
import { z } from 'zod';
import { GuildQuarantineConfigUpdate, RiskLevel } from '../../database/schema';

const repo = new QuarantineRepository();

const quarantineConfigSchema = z.object({
  enabled: z.boolean().optional(),
  quarantine_role_id: z.string().nullable().optional(),
  auto_quarantine_on_risk: z.boolean().optional(),
  auto_quarantine_risk_level: z.enum(['LOW', 'MODERATE', 'ELEVATED', 'HIGH', 'CRITICAL']).optional(),
  quarantine_duration_seconds: z.number().int().min(60).max(86400).optional(),
  max_quarantine_duration_seconds: z.number().int().min(120).max(604800).optional(),
  log_channel_id: z.string().nullable().optional(),
  bypass_roles: z.array(z.string()).optional(),
  bypass_users: z.array(z.string()).optional(),
});

export default class QuarantineCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('quarantine')
    .setDescription('Quarantine management')
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Show quarantine status')
    )
    .addSubcommand((sub) =>
      sub
        .setName('enable')
        .setDescription('Enable quarantine for this server')
    )
    .addSubcommand((sub) =>
      sub
        .setName('disable')
        .setDescription('Disable quarantine for this server')
    )
    .addSubcommand((sub) =>
      sub
        .setName('config')
        .setDescription('Update quarantine settings')
        .addStringOption((opt) =>
          opt.setName('setting').setDescription('Setting to update').setRequired(true)
            .addChoices(
              { name: 'quarantine_role_id', value: 'quarantine_role_id' },
              { name: 'auto_quarantine_on_risk', value: 'auto_quarantine_on_risk' },
              { name: 'auto_quarantine_risk_level', value: 'auto_quarantine_risk_level' },
              { name: 'quarantine_duration_seconds', value: 'quarantine_duration_seconds' },
              { name: 'max_quarantine_duration_seconds', value: 'max_quarantine_duration_seconds' },
              { name: 'log_channel_id', value: 'log_channel_id' },
            )
        )
        .addStringOption((opt) =>
          opt.setName('value').setDescription('New value').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('quarantine')
        .setDescription('Manually quarantine a user')
        .addStringOption((opt) =>
          opt.setName('user_id').setDescription('User ID to quarantine').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('reason').setDescription('Reason for quarantine').setRequired(false)
        )
        .addIntegerOption((opt) =>
          opt.setName('duration').setDescription('Duration in seconds (default: config)').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('release')
        .setDescription('Release a user from quarantine')
        .addStringOption((opt) =>
          opt.setName('user_id').setDescription('User ID to release').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('check')
        .setDescription('Check if a user is quarantined')
        .addStringOption((opt) =>
          opt.setName('user_id').setDescription('User ID to check').setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

  cooldown = 5;
  requiredPermissions = [PermissionFlagsBits.BanMembers];

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
      case 'quarantine':
        return this.handleQuarantine(interaction);
      case 'release':
        return this.handleRelease(interaction);
      case 'check':
        return this.handleCheck(interaction);
    }
  }

  private async handleStatus(interaction: ChatInputCommandInteraction): Promise<void> {
    const config = await repo.getOrCreateConfig(interaction.guildId!);

    const embed = new EmbedBuilder()
      .setTitle('Quarantine Status')
      .setColor(config.enabled ? Colors.Green : Colors.Red)
      .addFields(
        { name: 'Status', value: config.enabled ? 'Enabled' : 'Disabled', inline: true },
        { name: 'Quarantine Role', value: config.quarantine_role_id || 'None', inline: true },
        { name: 'Auto-Quarantine', value: config.auto_quarantine_on_risk ? 'Enabled' : 'Disabled', inline: true },
        { name: 'Risk Threshold', value: config.auto_quarantine_risk_level, inline: true },
        { name: 'Duration', value: `${config.quarantine_duration_seconds}s`, inline: true },
        { name: 'Max Duration', value: `${config.max_quarantine_duration_seconds}s`, inline: true },
        { name: 'Bypass Roles', value: config.bypass_roles.length > 0 ? config.bypass_roles.map(r => `<@&${r}>`).join(', ') : 'None', inline: true },
        { name: 'Bypass Users', value: config.bypass_users.length > 0 ? config.bypass_users.map(u => `<@${u}>`).join(', ') : 'None', inline: true },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }

  private async handleEnable(interaction: ChatInputCommandInteraction): Promise<void> {
    const config = await repo.updateConfig(interaction.guildId!, { enabled: true });
    invalidateQuarantineConfig(interaction.guildId!);

    await interaction.editReply({
      content: config ? 'Quarantine enabled.' : 'Failed to enable quarantine.',
    });
  }

  private async handleDisable(interaction: ChatInputCommandInteraction): Promise<void> {
    const config = await repo.updateConfig(interaction.guildId!, { enabled: false });
    invalidateQuarantineConfig(interaction.guildId!);

    await interaction.editReply({
      content: config ? 'Quarantine disabled.' : 'Failed to disable quarantine.',
    });
  }

  private async handleConfig(interaction: ChatInputCommandInteraction): Promise<void> {
    const setting = interaction.options.getString('setting', true);
    const value = interaction.options.getString('value', true);

    const updates: GuildQuarantineConfigUpdate = {};

    switch (setting) {
      case 'quarantine_role_id':
      case 'log_channel_id':
        updates[setting] = value === 'none' ? null : value;
        break;
      case 'auto_quarantine_on_risk':
        updates[setting] = value.toLowerCase() === 'true';
        break;
      case 'auto_quarantine_risk_level':
        updates[setting] = value.toUpperCase() as RiskLevel;
        break;
      case 'quarantine_duration_seconds':
      case 'max_quarantine_duration_seconds':
        updates[setting] = parseInt(value, 10);
        break;
    }

    ValidationGuard.validate(quarantineConfigSchema, updates);

    const config = await repo.updateConfig(interaction.guildId!, updates);
    invalidateQuarantineConfig(interaction.guildId!);

    await interaction.editReply({
      content: config ? `\`${setting}\` updated to \`${value}\`.` : 'Failed to update config.',
    });
  }

  private async handleQuarantine(interaction: ChatInputCommandInteraction): Promise<void> {
    const userId = interaction.options.getString('user_id', true);
    const reason = interaction.options.getString('reason') || 'Manual quarantine';
    const duration = interaction.options.getInteger('duration') || undefined;

    const config = await repo.getOrCreateConfig(interaction.guildId!);

    const member = await interaction.guild?.members.fetch(userId).catch(() => null);
    if (!member) {
      await interaction.editReply({ content: 'User not found in this server.' });
      return;
    }

    const result = await quarantineMember(member, config, reason, interaction.user.id, duration);

    if (result.quarantined) {
      await repo.logAction(interaction.guildId!, userId, 'QUARANTINE', reason, interaction.user.id, duration ?? config.quarantine_duration_seconds);

      if (config.log_channel_id) {
        const channel = interaction.guild?.channels.cache.get(config.log_channel_id) as import('discord.js').TextChannel | undefined;
        if (channel) {
          const embed = createQuarantineEmbed(member, 'QUARANTINE', reason, interaction.user.id, duration ?? config.quarantine_duration_seconds);
          await channel.send({ embeds: [embed] }).catch(() => {});
        }
      }
    }

    await interaction.editReply({ content: result.message });
  }

  private async handleRelease(interaction: ChatInputCommandInteraction): Promise<void> {
    const userId = interaction.options.getString('user_id', true);

    const config = await repo.getOrCreateConfig(interaction.guildId!);

    const member = await interaction.guild?.members.fetch(userId).catch(() => null);
    if (!member) {
      await interaction.editReply({ content: 'User not found in this server.' });
      return;
    }

    const result = await releaseMember(member, config, interaction.user.id);

    if (result.success) {
      await repo.logRelease(interaction.guildId!, userId, interaction.user.id);

      if (config.log_channel_id) {
        const channel = interaction.guild?.channels.cache.get(config.log_channel_id) as import('discord.js').TextChannel | undefined;
        if (channel) {
          const embed = createQuarantineEmbed(member, 'RELEASE', 'Released by admin', interaction.user.id);
          await channel.send({ embeds: [embed] }).catch(() => {});
        }
      }
    }

    await interaction.editReply({ content: result.message });
  }

  private async handleCheck(interaction: ChatInputCommandInteraction): Promise<void> {
    const userId = interaction.options.getString('user_id', true);

    const info = getQuarantineInfo(interaction.guildId!, userId);

    if (!info.quarantined || !info.entry) {
      await interaction.editReply({ content: `User \`${userId}\` is not quarantined.` });
      return;
    }

    const remaining = Math.max(0, Math.floor((info.entry.quarantinedAt + info.entry.durationMs - Date.now()) / 1000));

    const embed = new EmbedBuilder()
      .setTitle('Quarantine Check')
      .setColor(Colors.Orange)
      .addFields(
        { name: 'User', value: `<@${userId}>`, inline: true },
        { name: 'Reason', value: info.entry.reason, inline: true },
        { name: 'Remaining', value: `${remaining}s`, inline: true },
      )
      .setTimestamp();

    if (info.entry.performedBy) {
      embed.addFields({ name: 'Quarantined By', value: `<@${info.entry.performedBy}>`, inline: true });
    }

    await interaction.editReply({ embeds: [embed] });
  }
}
