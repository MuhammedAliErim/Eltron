import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
  Colors,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import { AutomodRepository } from '../../database/repositories/AutomodRepository';
import { invalidateAutomodConfig } from '../../services/security/AutomodConfig';
import { ValidationGuard } from '../../middleware/ValidationGuard';
import { z } from 'zod';
import { GuildAutomodConfigUpdate, AutomodActionType } from '../../database/schema';

const repo = new AutomodRepository();

const automodConfigSchema = z.object({
  enabled: z.boolean().optional(),
  default_action: z.enum(['DELETE', 'WARN', 'TIMEOUT', 'KICK', 'BAN']).optional(),
  flood_message_count: z.number().int().min(2).max(50).optional(),
  flood_window_seconds: z.number().int().min(1).max(60).optional(),
  duplicate_message_limit: z.number().int().min(2).max(20).optional(),
  duplicate_window_seconds: z.number().int().min(10).max(300).optional(),
  mention_limit: z.number().int().min(1).max(50).optional(),
  emoji_limit: z.number().int().min(1).max(50).optional(),
  caps_threshold: z.number().min(0.1).max(1.0).optional(),
  caps_min_length: z.number().int().min(1).max(100).optional(),
  blocked_invites: z.boolean().optional(),
  log_channel_id: z.string().nullable().optional(),
});

const bannedWordsSchema = z.object({
  words: z.array(z.string().min(1).max(100)).max(100),
});

const blockedDomainsSchema = z.object({
  domains: z.array(z.string().min(1).max(200)).max(50),
});

export default class AutomodCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('automod')
    .setDescription('AutoMod configuration')
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Show current automod status')
    )
    .addSubcommand((sub) =>
      sub
        .setName('enable')
        .setDescription('Enable automod for this server')
    )
    .addSubcommand((sub) =>
      sub
        .setName('disable')
        .setDescription('Disable automod for this server')
    )
    .addSubcommand((sub) =>
      sub
        .setName('config')
        .setDescription('Update automod settings')
        .addStringOption((opt) =>
          opt.setName('setting').setDescription('Setting to update').setRequired(true)
            .addChoices(
              { name: 'default_action', value: 'default_action' },
              { name: 'flood_message_count', value: 'flood_message_count' },
              { name: 'flood_window_seconds', value: 'flood_window_seconds' },
              { name: 'duplicate_message_limit', value: 'duplicate_message_limit' },
              { name: 'duplicate_window_seconds', value: 'duplicate_window_seconds' },
              { name: 'mention_limit', value: 'mention_limit' },
              { name: 'emoji_limit', value: 'emoji_limit' },
              { name: 'caps_threshold', value: 'caps_threshold' },
              { name: 'caps_min_length', value: 'caps_min_length' },
              { name: 'blocked_invites', value: 'blocked_invites' },
            )
        )
        .addStringOption((opt) =>
          opt.setName('value').setDescription('New value').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('bannedwords')
        .setDescription('Manage banned words')
        .addStringOption((opt) =>
          opt.setName('action').setDescription('Action').setRequired(true)
            .addChoices(
              { name: 'add', value: 'add' },
              { name: 'remove', value: 'remove' },
              { name: 'list', value: 'list' },
            )
        )
        .addStringOption((opt) =>
          opt.setName('words').setDescription('Comma-separated words').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('blockeddomains')
        .setDescription('Manage blocked domains')
        .addStringOption((opt) =>
          opt.setName('action').setDescription('Action').setRequired(true)
            .addChoices(
              { name: 'add', value: 'add' },
              { name: 'remove', value: 'remove' },
              { name: 'list', value: 'list' },
            )
        )
        .addStringOption((opt) =>
          opt.setName('domains').setDescription('Comma-separated domains').setRequired(false)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

  category = 'Security';
  cooldown = 5;
  requiredPermissions = [PermissionFlagsBits.ManageGuild];

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
      case 'bannedwords':
        return this.handleBannedWords(interaction);
      case 'blockeddomains':
        return this.handleBlockedDomains(interaction);
    }
  }

  private async handleStatus(interaction: ChatInputCommandInteraction): Promise<void> {
    const config = await repo.getOrCreateConfig(interaction.guildId!);

    const embed = new EmbedBuilder()
      .setTitle('AutoMod Status')
      .setColor(config.enabled ? Colors.Green : Colors.Red)
      .addFields(
        { name: 'Status', value: config.enabled ? 'Enabled' : 'Disabled', inline: true },
        { name: 'Default Action', value: config.default_action, inline: true },
        { name: 'Banned Words', value: `${config.banned_words.length}`, inline: true },
        { name: 'Blocked Domains', value: `${config.blocked_domains.length}`, inline: true },
        { name: 'Flood Limit', value: `${config.flood_message_count} msgs / ${config.flood_window_seconds}s`, inline: true },
        { name: 'Duplicate Limit', value: `${config.duplicate_message_limit}x / ${config.duplicate_window_seconds}s`, inline: true },
        { name: 'Mention Limit', value: `${config.mention_limit}`, inline: true },
        { name: 'Emoji Limit', value: `${config.emoji_limit}`, inline: true },
        { name: 'Caps Threshold', value: `${Math.round(config.caps_threshold * 100)}%`, inline: true },
        { name: 'Invite Block', value: config.blocked_invites ? 'Yes' : 'No', inline: true },
        { name: 'Bypass Roles', value: `${config.bypass_roles.length}`, inline: true },
        { name: 'Bypass Channels', value: `${config.bypass_channels.length}`, inline: true },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }

  private async handleEnable(interaction: ChatInputCommandInteraction): Promise<void> {
    const config = await repo.updateConfig(interaction.guildId!, { enabled: true });
    invalidateAutomodConfig(interaction.guildId!);

    await interaction.editReply({
      content: config ? 'AutoMod enabled.' : 'Failed to enable AutoMod.',
    });
  }

  private async handleDisable(interaction: ChatInputCommandInteraction): Promise<void> {
    const config = await repo.updateConfig(interaction.guildId!, { enabled: false });
    invalidateAutomodConfig(interaction.guildId!);

    await interaction.editReply({
      content: config ? 'AutoMod disabled.' : 'Failed to disable AutoMod.',
    });
  }

  private async handleConfig(interaction: ChatInputCommandInteraction): Promise<void> {
    const setting = interaction.options.getString('setting', true);
    const value = interaction.options.getString('value', true);

    const updates: GuildAutomodConfigUpdate = {};

    switch (setting) {
      case 'default_action':
        updates.default_action = value as AutomodActionType;
        break;
      case 'flood_message_count':
      case 'flood_window_seconds':
      case 'duplicate_message_limit':
      case 'duplicate_window_seconds':
      case 'mention_limit':
      case 'emoji_limit':
      case 'caps_min_length':
        updates[setting] = parseInt(value, 10);
        break;
      case 'caps_threshold':
        updates.caps_threshold = parseFloat(value);
        break;
      case 'blocked_invites':
        updates.blocked_invites = value === 'true';
        break;
    }

    if (Object.keys(updates).length === 0) {
      await interaction.editReply({ content: 'No valid setting was specified. Please check your input.' });
      return;
    }

    ValidationGuard.validate(automodConfigSchema, updates);

    const config = await repo.updateConfig(interaction.guildId!, updates);
    invalidateAutomodConfig(interaction.guildId!);

    await interaction.editReply({
      content: config ? `\`${setting}\` updated to \`${value}\`.` : 'Failed to update config.',
    });
  }

  private async handleBannedWords(interaction: ChatInputCommandInteraction): Promise<void> {
    const action = interaction.options.getString('action', true);
    const wordsInput = interaction.options.getString('words');

    const config = await repo.getOrCreateConfig(interaction.guildId!);

    if (action === 'list') {
      const words = config.banned_words.length > 0
        ? config.banned_words.map((w) => `\`${w}\``).join(', ')
        : 'None';
      await interaction.editReply({ content: `**Banned Words:** ${words}` });
      return;
    }

    if (!wordsInput) {
      await interaction.editReply({ content: 'Please provide words to add/remove.' });
      return;
    }

    const words = wordsInput.split(',').map((w) => w.trim()).filter(Boolean);
    ValidationGuard.validate(bannedWordsSchema, { words });

    let updated: string[];
    if (action === 'add') {
      updated = [...new Set([...config.banned_words, ...words])];
    } else {
      updated = config.banned_words.filter((w) => !words.includes(w));
    }

    await repo.updateConfig(interaction.guildId!, { banned_words: updated });
    invalidateAutomodConfig(interaction.guildId!);

    await interaction.editReply({
      content: `Banned words ${action === 'add' ? 'added' : 'removed'}. Total: ${updated.length}`,
    });
  }

  private async handleBlockedDomains(interaction: ChatInputCommandInteraction): Promise<void> {
    const action = interaction.options.getString('action', true);
    const domainsInput = interaction.options.getString('domains');

    const config = await repo.getOrCreateConfig(interaction.guildId!);

    if (action === 'list') {
      const domains = config.blocked_domains.length > 0
        ? config.blocked_domains.map((d) => `\`${d}\``).join(', ')
        : 'None';
      await interaction.editReply({ content: `**Blocked Domains:** ${domains}` });
      return;
    }

    if (!domainsInput) {
      await interaction.editReply({ content: 'Please provide domains to add/remove.' });
      return;
    }

    const domains = domainsInput.split(',').map((d) => d.trim()).filter(Boolean);
    ValidationGuard.validate(blockedDomainsSchema, { domains });

    let updated: string[];
    if (action === 'add') {
      updated = [...new Set([...config.blocked_domains, ...domains])];
    } else {
      updated = config.blocked_domains.filter((d) => !domains.includes(d));
    }

    await repo.updateConfig(interaction.guildId!, { blocked_domains: updated });
    invalidateAutomodConfig(interaction.guildId!);

    await interaction.editReply({
      content: `Blocked domains ${action === 'add' ? 'added' : 'removed'}. Total: ${updated.length}`,
    });
  }
}
