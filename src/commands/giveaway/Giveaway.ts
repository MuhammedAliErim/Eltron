import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  type ChatInputCommandInteraction,
  type TextChannel,
  type GuildMember,
} from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import { GiveawayRepository } from '../../database/repositories/GiveawayRepository';
import {
  parseDurationToMs,
  validateGiveawayParams,
  createGiveawayEmbed,
  createGiveawayButton,
  createGiveawayInfoEmbed,
  createGiveawayListEmbed,
  endGiveaway,
  cancelGiveaway,
  rerollGiveaway,
  scheduleGiveawayTimer,
  canManageGiveaway,
} from '../../services/giveaway/GiveawayService';
import { logger } from '../../utils/logger';

const repo = new GiveawayRepository();

export default class GiveawayCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Giveaway management')
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Create a new giveaway')
        .addStringOption((opt) =>
          opt.setName('prize').setDescription('Prize to give away').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('duration').setDescription('Duration (e.g. 30m, 1h, 7d)').setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt.setName('winners').setDescription('Number of winners (1-100)').setRequired(false)
        )
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('Channel to post in').setRequired(false)
        )
        .addStringOption((opt) =>
          opt.setName('description').setDescription('Giveaway description').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription('List giveaways in this server')
        .addStringOption((opt) =>
          opt.setName('status')
            .setDescription('Filter by status')
            .setRequired(false)
            .addChoices(
              { name: 'Active', value: 'ACTIVE' },
              { name: 'Ended', value: 'ENDED' },
              { name: 'Cancelled', value: 'CANCELLED' },
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('info')
        .setDescription('Get giveaway information')
        .addIntegerOption((opt) =>
          opt.setName('giveaway_id').setDescription('Giveaway ID').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('end')
        .setDescription('End a giveaway immediately')
        .addIntegerOption((opt) =>
          opt.setName('giveaway_id').setDescription('Giveaway ID').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('cancel')
        .setDescription('Cancel an active giveaway')
        .addIntegerOption((opt) =>
          opt.setName('giveaway_id').setDescription('Giveaway ID').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('reroll')
        .setDescription('Reroll a giveaway winner')
        .addIntegerOption((opt) =>
          opt.setName('giveaway_id').setDescription('Giveaway ID').setRequired(true)
        )
    );

  category = 'Events & Giveaways';
  cooldown = 3;

  async execute({ client, interaction }: CommandExecuteOptions): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'create':
        return this.handleCreate(client, interaction);
      case 'list':
        return this.handleList(interaction);
      case 'info':
        return this.handleInfo(interaction);
      case 'end':
        return this.handleEnd(client, interaction);
      case 'cancel':
        return this.handleCancel(client, interaction);
      case 'reroll':
        return this.handleReroll(client, interaction);
    }
  }

  private async handleCreate(
    client: import('discord.js').Client,
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    const prize = interaction.options.getString('prize', true);
    const durationStr = interaction.options.getString('duration', true);
    const winnerCount = interaction.options.getInteger('winners') || 1;
    const channelOption = interaction.options.getChannel('channel');
    const description = interaction.options.getString('description') || '';

    if (!interaction.guildId) {
      await interaction.reply({ content: 'Guild context required.', flags: MessageFlags.Ephemeral });
      return;
    }

    const durationMs = parseDurationToMs(durationStr);
    if (durationMs === null) {
      await interaction.reply({
        content: 'Invalid duration format. Use formats like `30s`, `10m`, `2h`, `7d`.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const validation = validateGiveawayParams(durationMs, winnerCount, prize);
    if (!validation.valid) {
      await interaction.reply({ content: validation.error!, flags: MessageFlags.Ephemeral });
      return;
    }

    const targetChannel = channelOption
      ? interaction.guild!.channels.cache.get(channelOption.id) as TextChannel | undefined
      : interaction.channel as TextChannel;

    if (!targetChannel || !targetChannel.isTextBased()) {
      await interaction.reply({ content: 'Target channel must be a text channel.', flags: MessageFlags.Ephemeral });
      return;
    }

    const botMember = interaction.guild!.members.me;
    if (!botMember) {
      await interaction.reply({ content: 'Bot member not found.', flags: MessageFlags.Ephemeral });
      return;
    }

    const permissions = targetChannel.permissionsFor(botMember);
    if (!permissions?.has(PermissionFlagsBits.SendMessages) || !permissions?.has(PermissionFlagsBits.ViewChannel)) {
      await interaction.reply({
        content: `I need View Channel and Send Messages permissions in <#${targetChannel.id}>.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const endsAt = new Date(Date.now() + durationMs).toISOString();

    const giveaway = await repo.createGiveaway({
      guild_id: interaction.guildId!,
      channel_id: targetChannel.id,
      host_id: interaction.user.id,
      prize,
      description,
      winner_count: winnerCount,
      ends_at: endsAt,
    });

    const embed = createGiveawayEmbed(giveaway, 0);
    const row = createGiveawayButton(giveaway.id, true);

    let sentMessage;
    try {
      sentMessage = await targetChannel.send({ embeds: [embed], components: [row] });
    } catch (err) {
      logger.error({ err, guildId: interaction.guildId }, 'Failed to send giveaway message');
      await interaction.editReply({ content: 'Failed to send giveaway message. Check bot permissions.' });
      return;
    }

    await repo.updateGiveaway(giveaway.id, { message_id: sentMessage.id });

    const updatedGiveaway = await repo.getGiveaway(giveaway.id);
    if (updatedGiveaway) {
      scheduleGiveawayTimer(updatedGiveaway, repo, client);
    }

    logger.info({
      giveawayId: giveaway.id,
      guildId: interaction.guildId,
      hostId: interaction.user.id,
      prize,
      winnerCount,
      channel: targetChannel.id,
    }, 'Giveaway created');

    await interaction.editReply({
      content: `Giveaway created in <#${targetChannel.id}>! Ends ${`<t:${Math.floor(Date.now() / 1000 + durationMs / 1000)}:R>`}.`,
    });
  }

  private async handleList(interaction: ChatInputCommandInteraction): Promise<void> {
    const status = interaction.options.getString('status') || undefined;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const giveaways = await repo.listGuildGiveaways(interaction.guildId!, status);

    const embed = createGiveawayListEmbed(giveaways, interaction.guild!.name);
    await interaction.editReply({ embeds: [embed] });
  }

  private async handleInfo(interaction: ChatInputCommandInteraction): Promise<void> {
    const giveawayId = interaction.options.getInteger('giveaway_id', true);

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const giveaway = await repo.getGiveaway(giveawayId);
    if (!giveaway) {
      await interaction.editReply({ content: 'Giveaway not found.' });
      return;
    }

    if (giveaway.guild_id !== interaction.guildId) {
      await interaction.editReply({ content: 'Giveaway not found in this server.' });
      return;
    }

    const entryCount = await repo.countEntries(giveawayId);
    const winners = await repo.getWinners(giveawayId);
    const embed = createGiveawayInfoEmbed(giveaway, entryCount, winners);
    await interaction.editReply({ embeds: [embed] });
  }

  private async handleEnd(
    client: import('discord.js').Client,
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    const giveawayId = interaction.options.getInteger('giveaway_id', true);

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const giveaway = await repo.getGiveaway(giveawayId);
    if (!giveaway) {
      await interaction.editReply({ content: 'Giveaway not found.' });
      return;
    }

    if (giveaway.guild_id !== interaction.guildId) {
      await interaction.editReply({ content: 'Giveaway not found in this server.' });
      return;
    }

    const member = interaction.member as GuildMember;
    if (!member || !canManageGiveaway(member, giveaway)) {
      await interaction.editReply({ content: 'You do not have permission to end this giveaway.' });
      return;
    }

    const result = await endGiveaway(giveawayId, repo, client);
    await interaction.editReply({ content: result.message });
  }

  private async handleCancel(
    client: import('discord.js').Client,
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    const giveawayId = interaction.options.getInteger('giveaway_id', true);

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const giveaway = await repo.getGiveaway(giveawayId);
    if (!giveaway) {
      await interaction.editReply({ content: 'Giveaway not found.' });
      return;
    }

    if (giveaway.guild_id !== interaction.guildId) {
      await interaction.editReply({ content: 'Giveaway not found in this server.' });
      return;
    }

    const member = interaction.member as GuildMember;
    if (!member) {
      await interaction.editReply({ content: 'Could not identify you as a member.' });
      return;
    }

    if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.editReply({ content: 'You need ManageGuild permission to cancel giveaways.' });
      return;
    }

    const result = await cancelGiveaway(giveawayId, repo, client);
    await interaction.editReply({ content: result.message });
  }

  private async handleReroll(
    client: import('discord.js').Client,
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    const giveawayId = interaction.options.getInteger('giveaway_id', true);

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const giveaway = await repo.getGiveaway(giveawayId);
    if (!giveaway) {
      await interaction.editReply({ content: 'Giveaway not found.' });
      return;
    }

    if (giveaway.guild_id !== interaction.guildId) {
      await interaction.editReply({ content: 'Giveaway not found in this server.' });
      return;
    }

    const member = interaction.member as GuildMember;
    if (!member || !canManageGiveaway(member, giveaway)) {
      await interaction.editReply({ content: 'You do not have permission to reroll this giveaway.' });
      return;
    }

    const result = await rerollGiveaway(giveawayId, repo, client);
    await interaction.editReply({ content: result.message });
  }
}
