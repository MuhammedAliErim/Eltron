import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import { LevelRepository } from '../../database/repositories/LevelRepository';
import {
  calculateLevel,
  createProfileEmbed,
  createLeaderboardEmbed,
} from '../../services/level/LevelService';
import { logger } from '../../utils/logger';

const repo = new LevelRepository();

export default class LevelCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('level')
    .setDescription('Level and XP system')
    .addSubcommand((sub) =>
      sub
        .setName('profile')
        .setDescription('View level profile')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Target member').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('rank')
        .setDescription('View rank')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Target member').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('leaderboard').setDescription('View server leaderboard')
    )
    .addSubcommand((sub) =>
      sub
        .setName('setxp')
        .setDescription('Set user XP (Admin)')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Target member').setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt.setName('amount').setDescription('XP amount').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('addxp')
        .setDescription('Add XP to user (Admin)')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Target member').setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt.setName('amount').setDescription('XP amount').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('removexp')
        .setDescription('Remove XP from user (Admin)')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Target member').setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt.setName('amount').setDescription('XP amount').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('reset')
        .setDescription('Reset user XP (Admin)')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Target member').setRequired(true)
        )
    );

  category = 'Level & Economy';
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
      case 'profile':
        return this.handleProfile(interaction, guildId);
      case 'rank':
        return this.handleRank(interaction, guildId);
      case 'leaderboard':
        return this.handleLeaderboard(interaction, guildId);
      case 'setxp':
        return this.handleSetXP(interaction, guildId);
      case 'addxp':
        return this.handleAddXP(interaction, guildId);
      case 'removexp':
        return this.handleRemoveXP(interaction, guildId);
      case 'reset':
        return this.handleReset(interaction, guildId);
    }
  }

  private async handleProfile(
    interaction: ChatInputCommandInteraction,
    guildId: string
  ): Promise<void> {
    const target = interaction.options.getUser('user') || interaction.user;

    if (target.bot) {
      await interaction.editReply({ content: 'Bots do not have XP profiles.' });
      return;
    }

    const userXP = await repo.getUserXP(guildId, target.id);

    if (!userXP) {
      await interaction.editReply({ content: 'No XP data found for this user.' });
      return;
    }

    const rank = await repo.getUserRank(guildId, target.id);
    const embed = createProfileEmbed(userXP, rank);
    await interaction.editReply({ embeds: [embed] });
  }

  private async handleRank(
    interaction: ChatInputCommandInteraction,
    guildId: string
  ): Promise<void> {
    const target = interaction.options.getUser('user') || interaction.user;

    if (target.bot) {
      await interaction.editReply({ content: 'Bots do not have XP profiles.' });
      return;
    }

    const userXP = await repo.getUserXP(guildId, target.id);

    if (!userXP) {
      await interaction.editReply({ content: 'No XP data found for this user.' });
      return;
    }

    const rank = await repo.getUserRank(guildId, target.id);
    const level = calculateLevel(userXP.xp);

    await interaction.editReply({
      content: `<@${target.id}> — Rank #${rank || 'N/A'} — Level ${level} — ${userXP.xp.toLocaleString()} XP`,
    });
  }

  private async handleLeaderboard(
    interaction: ChatInputCommandInteraction,
    guildId: string
  ): Promise<void> {
    const entries = await repo.getLeaderboard(guildId, 10);
    const embed = createLeaderboardEmbed(entries, interaction.guild!.name);
    await interaction.editReply({ embeds: [embed] });
  }

  private async handleSetXP(
    interaction: ChatInputCommandInteraction,
    guildId: string
  ): Promise<void> {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.editReply({ content: 'You need ManageGuild permission.' });
      return;
    }

    const target = interaction.options.getUser('user', true);
    const amount = interaction.options.getInteger('amount', true);

    if (target.bot) {
      await interaction.editReply({ content: 'Cannot modify bot XP.' });
      return;
    }

    if (amount < 0 || amount > 100_000_000) {
      await interaction.editReply({ content: 'XP must be between 0 and 100,000,000.' });
      return;
    }

    const updated = await repo.setXP(guildId, target.id, amount);

    logger.info({
      guildId,
      targetUserId: target.id,
      actorUserId: interaction.user.id,
      action: 'SET_XP',
      amount,
    }, 'XP set by admin');

    await interaction.editReply({
      content: `Set <@${target.id}>'s XP to ${amount.toLocaleString()} (Level ${calculateLevel(updated.xp)}).`,
    });
  }

  private async handleAddXP(
    interaction: ChatInputCommandInteraction,
    guildId: string
  ): Promise<void> {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.editReply({ content: 'You need ManageGuild permission.' });
      return;
    }

    const target = interaction.options.getUser('user', true);
    const amount = interaction.options.getInteger('amount', true);

    if (target.bot) {
      await interaction.editReply({ content: 'Cannot modify bot XP.' });
      return;
    }

    if (amount <= 0 || amount > 100_000_000) {
      await interaction.editReply({ content: 'Amount must be between 1 and 100,000,000.' });
      return;
    }

    const updated = await repo.addXP(guildId, target.id, amount);

    logger.info({
      guildId,
      targetUserId: target.id,
      actorUserId: interaction.user.id,
      action: 'ADD_XP',
      amount,
    }, 'XP added by admin');

    await interaction.editReply({
      content: `Added ${amount.toLocaleString()} XP to <@${target.id}> (Total: ${updated.xp.toLocaleString()}, Level ${calculateLevel(updated.xp)}).`,
    });
  }

  private async handleRemoveXP(
    interaction: ChatInputCommandInteraction,
    guildId: string
  ): Promise<void> {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.editReply({ content: 'You need ManageGuild permission.' });
      return;
    }

    const target = interaction.options.getUser('user', true);
    const amount = interaction.options.getInteger('amount', true);

    if (target.bot) {
      await interaction.editReply({ content: 'Cannot modify bot XP.' });
      return;
    }

    if (amount <= 0 || amount > 100_000_000) {
      await interaction.editReply({ content: 'Amount must be between 1 and 100,000,000.' });
      return;
    }

    const updated = await repo.removeXP(guildId, target.id, amount);

    logger.info({
      guildId,
      targetUserId: target.id,
      actorUserId: interaction.user.id,
      action: 'REMOVE_XP',
      amount,
    }, 'XP removed by admin');

    await interaction.editReply({
      content: `Removed ${amount.toLocaleString()} XP from <@${target.id}> (Total: ${updated.xp.toLocaleString()}, Level ${calculateLevel(updated.xp)}).`,
    });
  }

  private async handleReset(
    interaction: ChatInputCommandInteraction,
    guildId: string
  ): Promise<void> {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.editReply({ content: 'You need ManageGuild permission.' });
      return;
    }

    const target = interaction.options.getUser('user', true);

    if (target.bot) {
      await interaction.editReply({ content: 'Cannot reset bot XP.' });
      return;
    }

    await repo.resetUserXP(guildId, target.id);

    logger.info({
      guildId,
      targetUserId: target.id,
      actorUserId: interaction.user.id,
      action: 'RESET_XP',
    }, 'XP reset by admin');

    await interaction.editReply({ content: `Reset XP for <@${target.id}>.` });
  }
}
