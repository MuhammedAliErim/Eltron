import {
  Guild,
  GuildMember,
  ChatInputCommandInteraction,
} from 'discord.js';
import { PermissionError } from '../../utils/errors';

export interface HierarchyCheckResult {
  allowed: boolean;
  error?: string;
}

export class ModerationHierarchyService {
  static checkModeratorHierarchy(
    moderator: GuildMember,
    target: GuildMember
  ): HierarchyCheckResult {
    if (moderator.id === target.id) {
      return { allowed: false, error: 'You cannot moderate yourself.' };
    }

    if (target.guild.ownerId === target.id) {
      return { allowed: false, error: 'You cannot moderate the server owner.' };
    }

    const moderatorHighest = moderator.roles.highest;
    const targetHighest = target.roles.highest;

    if (moderatorHighest.position <= targetHighest.position) {
      return {
        allowed: false,
        error: `Your highest role (\`${moderatorHighest.name}\`) must be above the target's highest role (\`${targetHighest.name}\`).`,
      };
    }

    return { allowed: true };
  }

  static checkBotHierarchy(bot: GuildMember, target: GuildMember): HierarchyCheckResult {
    if (target.id === bot.id) {
      return { allowed: false, error: 'The bot cannot moderate itself.' };
    }

    if (target.guild.ownerId === target.id) {
      return { allowed: false, error: 'The bot cannot moderate the server owner.' };
    }

    const botHighest = bot.roles.highest;
    const targetHighest = target.roles.highest;

    if (botHighest.position <= targetHighest.position) {
      return {
        allowed: false,
        error: `My highest role (\`${botHighest.name}\`) must be above the target's highest role (\`${targetHighest.name}\`).`,
      };
    }

    return { allowed: true };
  }

  static checkCanBan(
    interaction: ChatInputCommandInteraction,
    target: GuildMember
  ): void {
    if (!interaction.guild || !interaction.member || !interaction.guild.members.me) {
      throw new PermissionError('This command can only be used in a server.');
    }

    const moderator = interaction.member as GuildMember;
    const bot = interaction.guild.members.me;

    const modCheck = this.checkModeratorHierarchy(moderator, target);
    if (!modCheck.allowed) {
      throw new PermissionError(modCheck.error);
    }

    const botCheck = this.checkBotHierarchy(bot, target);
    if (!botCheck.allowed) {
      throw new PermissionError(botCheck.error);
    }
  }

  static checkCanKick(
    interaction: ChatInputCommandInteraction,
    target: GuildMember
  ): void {
    this.checkCanBan(interaction, target);
  }

  static checkCanTimeout(
    interaction: ChatInputCommandInteraction,
    target: GuildMember
  ): void {
    this.checkCanBan(interaction, target);
  }

  static ensureGuildContext(interaction: ChatInputCommandInteraction): {
    guild: Guild;
    moderator: GuildMember;
    bot: GuildMember;
  } {
    if (!interaction.guild) {
      throw new PermissionError('This command can only be used in a server.');
    }
    if (!interaction.member || !(interaction.member instanceof Object && 'roles' in interaction.member)) {
      throw new PermissionError('Could not resolve your member data.');
    }
    if (!interaction.guild.members.me) {
      throw new PermissionError('Bot member data not available.');
    }

    return {
      guild: interaction.guild,
      moderator: interaction.member as GuildMember,
      bot: interaction.guild.members.me,
    };
  }
}
