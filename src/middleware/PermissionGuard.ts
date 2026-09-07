import { ChatInputCommandInteraction, PermissionResolvable } from 'discord.js';
import { BOT_OWNERS } from '../config/bot';
import { PermissionError } from '../utils/errors';

export class PermissionGuard {
  static checkDeveloperOnly(interaction: ChatInputCommandInteraction): void {
    if (BOT_OWNERS.length === 0) {
      throw new PermissionError('No bot owners configured.');
    }
    if (!BOT_OWNERS.includes(interaction.user.id)) {
      throw new PermissionError('This command is bot-owner only.');
    }
  }

  static checkPermissions(
    interaction: ChatInputCommandInteraction,
    required: PermissionResolvable[]
  ): void {
    if (!interaction.memberPermissions?.has(required)) {
      throw new PermissionError('Insufficient permissions for this command.');
    }
  }

  static checkGuildOwnership(interaction: ChatInputCommandInteraction): void {
    if (!interaction.guild) {
      throw new PermissionError('This command can only be used in a server.');
    }
    if (interaction.guild.ownerId !== interaction.user.id) {
      throw new PermissionError('Only the guild owner can perform this action.');
    }
  }

  static isBotOwner(userId: string): boolean {
    return BOT_OWNERS.includes(userId);
  }
}
