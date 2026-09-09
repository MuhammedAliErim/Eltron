import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
  Colors,
  type ChatInputCommandInteraction,
  type TextChannel,
} from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import { ChannelWarningRepository } from '../../database/repositories/ChannelWarningRepository';
import { invalidateChannelWarningConfig } from '../../services/security/ChannelWarningConfig';
import {
  applySlowmode,
  resetChannelViolations,
  createChannelWarningEmbed,
} from '../../services/security/ChannelWarningService';
import { ValidationGuard } from '../../middleware/ValidationGuard';
import { z } from 'zod';
import { GuildChannelWarningConfigUpdate } from '../../database/schema';

const repo = new ChannelWarningRepository();

const channelWarningConfigSchema = z.object({
  enabled: z.boolean().optional(),
  auto_warning_on_spam: z.boolean().optional(),
  slowmode_escalation_steps: z.array(z.number().int().min(1).max(21600)).optional(),
  violation_threshold: z.number().int().min(1).max(50).optional(),
  escalation_window_seconds: z.number().int().min(30).max(3600).optional(),
  deescalation_delay_seconds: z.number().int().min(60).max(86400).optional(),
  max_slowmode_seconds: z.number().int().min(5).max(21600).optional(),
  log_channel_id: z.string().nullable().optional(),
});

export default class ChannelWarningCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('channelwarning')
    .setDescription('Channel warning configuration')
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Show channel warning status')
    )
    .addSubcommand((sub) =>
      sub
        .setName('enable')
        .setDescription('Enable channel warnings for this server')
    )
    .addSubcommand((sub) =>
      sub
        .setName('disable')
        .setDescription('Disable channel warnings for this server')
    )
    .addSubcommand((sub) =>
      sub
        .setName('config')
        .setDescription('Update channel warning settings')
        .addStringOption((opt) =>
          opt.setName('setting').setDescription('Setting to update').setRequired(true)
            .addChoices(
              { name: 'auto_warning_on_spam', value: 'auto_warning_on_spam' },
              { name: 'violation_threshold', value: 'violation_threshold' },
              { name: 'escalation_window_seconds', value: 'escalation_window_seconds' },
              { name: 'deescalation_delay_seconds', value: 'deescalation_delay_seconds' },
              { name: 'max_slowmode_seconds', value: 'max_slowmode_seconds' },
              { name: 'log_channel_id', value: 'log_channel_id' },
            )
        )
        .addStringOption((opt) =>
          opt.setName('value').setDescription('New value').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('set')
        .setDescription('Manually set slowmode for a channel')
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('Channel to set slowmode').setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt.setName('slowmode').setDescription('Slowmode in seconds (0 to remove)').setRequired(true)
            .setMinValue(0)
            .setMaxValue(21600)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('reset')
        .setDescription('Reset violations and slowmode for a channel')
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('Channel to reset').setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

  category = 'Security';
  cooldown = 5;
  requiredPermissions = [PermissionFlagsBits.ManageChannels];

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    switch (subcommand) {
      case 'status':
        return this.handleStatus(interaction);
      case 'enable':
        return this.handleEnable(interaction);
      case 'disable':
        return this.handleDisable(interaction);
      case 'config':
        return this.handleConfig(interaction);
      case 'set':
        return this.handleSet(interaction);
      case 'reset':
        return this.handleReset(interaction);
    }
  }

  private async handleStatus(interaction: ChatInputCommandInteraction): Promise<void> {
    const config = await repo.getOrCreateConfig(interaction.guildId!);

    const embed = new EmbedBuilder()
      .setTitle('Channel Warning Status')
      .setColor(config.enabled ? Colors.Green : Colors.Red)
      .addFields(
        { name: 'Status', value: config.enabled ? 'Enabled' : 'Disabled', inline: true },
        { name: 'Auto-Warning', value: config.auto_warning_on_spam ? 'Enabled' : 'Disabled', inline: true },
        { name: 'Threshold', value: `${config.violation_threshold} violations`, inline: true },
        { name: 'Escalation Window', value: `${config.escalation_window_seconds}s`, inline: true },
        { name: 'Deescalation Delay', value: `${config.deescalation_delay_seconds}s`, inline: true },
        { name: 'Max Slowmode', value: `${config.max_slowmode_seconds}s`, inline: true },
        { name: 'Escalation Steps', value: config.slowmode_escalation_steps.join(' → ') + 's', inline: false },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }

  private async handleEnable(interaction: ChatInputCommandInteraction): Promise<void> {
    const config = await repo.updateConfig(interaction.guildId!, { enabled: true });
    invalidateChannelWarningConfig(interaction.guildId!);

    await interaction.editReply({
      content: config ? 'Channel warnings enabled.' : 'Failed to enable.',
    });
  }

  private async handleDisable(interaction: ChatInputCommandInteraction): Promise<void> {
    const config = await repo.updateConfig(interaction.guildId!, { enabled: false });
    invalidateChannelWarningConfig(interaction.guildId!);

    await interaction.editReply({
      content: config ? 'Channel warnings disabled.' : 'Failed to disable.',
    });
  }

  private async handleConfig(interaction: ChatInputCommandInteraction): Promise<void> {
    const setting = interaction.options.getString('setting', true);
    const value = interaction.options.getString('value', true);

    const updates: GuildChannelWarningConfigUpdate = {};

    switch (setting) {
      case 'auto_warning_on_spam':
        updates[setting] = value.toLowerCase() === 'true';
        break;
      case 'log_channel_id':
        updates[setting] = value === 'none' ? null : value;
        break;
      case 'violation_threshold':
      case 'escalation_window_seconds':
      case 'deescalation_delay_seconds':
      case 'max_slowmode_seconds':
        updates[setting] = parseInt(value, 10);
        break;
    }

    if (Object.keys(updates).length === 0) {
      await interaction.editReply({ content: 'No valid setting was specified. Please check your input.' });
      return;
    }

    ValidationGuard.validate(channelWarningConfigSchema, updates);

    const config = await repo.updateConfig(interaction.guildId!, updates);
    invalidateChannelWarningConfig(interaction.guildId!);

    await interaction.editReply({
      content: config ? `\`${setting}\` updated to \`${value}\`.` : 'Failed to update config.',
    });
  }

  private async handleSet(interaction: ChatInputCommandInteraction): Promise<void> {
    const channel = interaction.options.getChannel('channel', true);
    const slowmode = interaction.options.getInteger('slowmode', true);

    const textChannel = interaction.guild?.channels.cache.get(channel.id) as TextChannel | undefined;
    if (!textChannel || !textChannel.isTextBased()) {
      await interaction.editReply({ content: 'Please select a text channel.' });
      return;
    }

    const result = await applySlowmode(textChannel, slowmode, `Manual set by ${interaction.user.tag}`);

    if (result.success) {
      const config = await repo.getOrCreateConfig(interaction.guildId!);
      await repo.logAction(
        interaction.guildId!,
        channel.id,
        'MANUAL',
        textChannel.rateLimitPerUser || 0,
        slowmode,
        `Manual set by ${interaction.user.tag}`,
        interaction.user.id
      );

      if (config.log_channel_id) {
        const logChannel = interaction.guild?.channels.cache.get(config.log_channel_id) as TextChannel | undefined;
        if (logChannel) {
          const embed = createChannelWarningEmbed(
            textChannel,
            'MANUAL',
            textChannel.rateLimitPerUser || 0,
            slowmode,
            `Manual set by ${interaction.user.tag}`,
            interaction.user.id
          );
          await logChannel.send({ embeds: [embed] }).catch(() => {});
        }
      }
    }

    await interaction.editReply({ content: result.message });
  }

  private async handleReset(interaction: ChatInputCommandInteraction): Promise<void> {
    const channel = interaction.options.getChannel('channel', true);

    const textChannel = interaction.guild?.channels.cache.get(channel.id) as TextChannel | undefined;
    if (!textChannel || !textChannel.isTextBased()) {
      await interaction.editReply({ content: 'Please select a text channel.' });
      return;
    }

    resetChannelViolations(interaction.guildId!, channel.id);

    const result = await applySlowmode(textChannel, 0, `Reset by ${interaction.user.tag}`);

    if (result.success) {
      const config = await repo.getOrCreateConfig(interaction.guildId!);
      await repo.logAction(
        interaction.guildId!,
        channel.id,
        'RESET',
        textChannel.rateLimitPerUser || 0,
        0,
        `Reset by ${interaction.user.tag}`,
        interaction.user.id
      );

      if (config.log_channel_id) {
        const logChannel = interaction.guild?.channels.cache.get(config.log_channel_id) as TextChannel | undefined;
        if (logChannel) {
          const embed = createChannelWarningEmbed(
            textChannel,
            'DEESCALATE',
            textChannel.rateLimitPerUser || 0,
            0,
            `Reset by ${interaction.user.tag}`,
            interaction.user.id
          );
          await logChannel.send({ embeds: [embed] }).catch(() => {});
        }
      }
    }

    await interaction.editReply({ content: result.success ? 'Channel violations reset and slowmode removed.' : result.message });
  }
}
