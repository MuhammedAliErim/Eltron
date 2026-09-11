import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import { WelcomeRepository } from '../../database/repositories/WelcomeRepository';
import { generateWelcomeCard } from '../../services/welcome/WelcomeImageGenerator';

const repo = new WelcomeRepository();

export default class WelcomeConfigCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('welcomeconfig')
    .setDescription('Configure welcome/goodbye appearance')
    .addSubcommand((sub) =>
      sub
        .setName('embed')
        .setDescription('Configure embed appearance')
        .addBooleanOption((opt) =>
          opt.setName('enabled').setDescription('Use rich embed cards').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('color').setDescription('Embed color (hex, e.g. #5865F2)')
        )
        .addStringOption((opt) =>
          opt.setName('banner').setDescription('Banner image URL')
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('dm')
        .setDescription('Configure DM welcome message')
        .addBooleanOption((opt) =>
          opt.setName('enabled').setDescription('Send DM on join').setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('message')
            .setDescription('DM message (use {user}, {username}, {server}, {memberCount})')
        )
    )
    .addSubcommand((sub) =>
      sub.setName('preview').setDescription('Preview the welcome embed')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

  category = 'Server Management';
  cooldown = 10;
  requiredPermissions = [PermissionFlagsBits.ManageGuild];

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({
        content: 'This command can only be used in a server.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    switch (subcommand) {
      case 'embed':
        return this.handleEmbed(interaction, guildId);
      case 'dm':
        return this.handleDm(interaction, guildId);
      case 'preview':
        return this.handlePreview(interaction, guildId);
    }
  }

  private async handleEmbed(
    interaction: ChatInputCommandInteraction,
    guildId: string
  ): Promise<void> {
    const enabled = interaction.options.getBoolean('enabled', true);
    const color = interaction.options.getString('color');
    const banner = interaction.options.getString('banner');

    const updates: Record<string, unknown> = {};

    if (color) {
      const hexRegex = /^#[0-9A-Fa-f]{6}$/;
      if (!hexRegex.test(color)) {
        await interaction.editReply({
          content: 'Invalid hex color. Use format: #5865F2',
        });
        return;
      }
      updates.embed_color = color;
    }

    if (banner !== null) {
      updates.banner_url = banner;
    }

    await repo.upsertConfig(guildId, {
      welcome_use_embed: enabled,
      ...(updates as Record<string, unknown>),
    });

    await interaction.editReply({
      content: `Welcome embed ${enabled ? 'enabled' : 'disabled'}${color ? ` with color ${color}` : ''}.`,
    });
  }

  private async handleDm(
    interaction: ChatInputCommandInteraction,
    guildId: string
  ): Promise<void> {
    const enabled = interaction.options.getBoolean('enabled', true);
    const message = interaction.options.getString('message');

    const updates: Record<string, unknown> = {};

    if (message) {
      if (message.length > 2000) {
        await interaction.editReply({ content: 'Message too long (max 2000 characters).' });
        return;
      }
      updates.dm_message = message;
    }

    await repo.upsertConfig(guildId, {
      dm_enabled: enabled,
      ...(updates as Record<string, unknown>),
    });

    await interaction.editReply({
      content: `DM welcome ${enabled ? 'enabled' : 'disabled'}${message ? ' with custom message.' : '.'}`,
    });
  }

  private async handlePreview(
    interaction: ChatInputCommandInteraction,
    guildId: string
  ): Promise<void> {
    const config = await repo.getConfig(guildId);
    const member = interaction.member as import('discord.js').GuildMember;

    if (!member) {
      await interaction.editReply({ content: 'Could not fetch member data.' });
      return;
    }

    const { embed, attachment } = await generateWelcomeCard(member, config.embed_color || config.welcome_embed_color);

    if (attachment) {
      await interaction.editReply({ embeds: [embed], files: [attachment] });
    } else {
      await interaction.editReply({ embeds: [embed] });
    }
  }
}
