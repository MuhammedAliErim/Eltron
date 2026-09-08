import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import { WelcomeRepository } from '../../database/repositories/WelcomeRepository';
import { getStatusDescription, validateChannelAccess } from '../../services/welcome/WelcomeService';

const repo = new WelcomeRepository();

export default class GoodbyeCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('goodbye')
    .setDescription('Goodbye system configuration')
    .addSubcommand((sub) =>
      sub.setName('enable').setDescription('Enable goodbye messages')
    )
    .addSubcommand((sub) =>
      sub.setName('disable').setDescription('Disable goodbye messages')
    )
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('View goodbye configuration')
    )
    .addSubcommand((sub) =>
      sub
        .setName('channel')
        .setDescription('Set goodbye channel')
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('Text channel').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('message')
        .setDescription('Set goodbye message')
        .addStringOption((opt) =>
          opt
            .setName('message')
            .setDescription('Message (use {user}, {username}, {server}, {memberCount})')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('embed')
        .setDescription('Toggle embed mode')
        .addBooleanOption((opt) =>
          opt.setName('enabled').setDescription('Use embed').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('reset').setDescription('Reset goodbye configuration')
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
    const guildId = interaction.guildId!;

    switch (subcommand) {
      case 'enable':
        return this.handleEnable(interaction, guildId);
      case 'disable':
        return this.handleDisable(interaction, guildId);
      case 'status':
        return this.handleStatus(interaction, guildId);
      case 'channel':
        return this.handleChannel(interaction, guildId);
      case 'message':
        return this.handleMessage(interaction, guildId);
      case 'embed':
        return this.handleEmbed(interaction, guildId);
      case 'reset':
        return this.handleReset(interaction, guildId);
    }
  }

  private async handleEnable(
    interaction: ChatInputCommandInteraction,
    guildId: string
  ): Promise<void> {
    const config = await repo.getConfig(guildId);

    if (!config.goodbye_channel_id) {
      await interaction.editReply({
        content: 'Set a goodbye channel first with `/goodbye channel`.',
      });
      return;
    }

    await repo.upsertConfig(guildId, { goodbye_enabled: true });
    await interaction.editReply({ content: 'Goodbye messages enabled.' });
  }

  private async handleDisable(
    interaction: ChatInputCommandInteraction,
    guildId: string
  ): Promise<void> {
    await repo.upsertConfig(guildId, { goodbye_enabled: false });
    await interaction.editReply({ content: 'Goodbye messages disabled.' });
  }

  private async handleStatus(
    interaction: ChatInputCommandInteraction,
    guildId: string
  ): Promise<void> {
    const config = await repo.getConfig(guildId);
    const status = getStatusDescription(config);

    await interaction.editReply({
      content: [status.welcome, '', status.goodbye].join('\n'),
    });
  }

  private async handleChannel(
    interaction: ChatInputCommandInteraction,
    guildId: string
  ): Promise<void> {
    const channel = interaction.options.getChannel('channel', true);

    if (channel.type !== 0) {
      await interaction.editReply({ content: 'Channel must be a text channel.' });
      return;
    }

    if (!validateChannelAccess(interaction.guild!, channel.id)) {
      await interaction.editReply({ content: 'Cannot access that channel.' });
      return;
    }

    await repo.upsertConfig(guildId, { goodbye_channel_id: channel.id });
    await interaction.editReply({
      content: `Goodbye channel set to <#${channel.id}>.`,
    });
  }

  private async handleMessage(
    interaction: ChatInputCommandInteraction,
    guildId: string
  ): Promise<void> {
    const message = interaction.options.getString('message', true);

    if (message.length > 2000) {
      await interaction.editReply({ content: 'Message too long (max 2000 characters).' });
      return;
    }

    await repo.upsertConfig(guildId, { goodbye_message: message });
    await interaction.editReply({ content: 'Goodbye message updated.' });
  }

  private async handleEmbed(
    interaction: ChatInputCommandInteraction,
    guildId: string
  ): Promise<void> {
    const enabled = interaction.options.getBoolean('enabled', true);

    await repo.upsertConfig(guildId, { goodbye_use_embed: enabled });
    await interaction.editReply({
      content: `Goodbye embed ${enabled ? 'enabled' : 'disabled'}.`,
    });
  }

  private async handleReset(
    interaction: ChatInputCommandInteraction,
    guildId: string
  ): Promise<void> {
    await repo.resetConfig(guildId);
    await interaction.editReply({ content: 'Goodbye configuration reset.' });
  }
}
