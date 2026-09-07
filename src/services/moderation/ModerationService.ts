import {
  Guild,
  GuildMember,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Colors,
} from 'discord.js';
import { ModerationCaseRepository } from '../../database/repositories/ModerationCaseRepository';
import { ModerationCaseRow, ModerationAction } from '../../database/schema';
import { logError, logger } from '../../utils/logger';
import { DatabaseQueryError } from '../../utils/errors';
import { formatDuration } from '../../utils/duration';

const CASE_FORMAT = (caseId: number): string => `CASE-${String(caseId).padStart(6, '0')}`;

export class ModerationService {
  private caseRepo: ModerationCaseRepository;

  constructor() {
    this.caseRepo = new ModerationCaseRepository();
  }

  async ban(
    interaction: ChatInputCommandInteraction,
    target: GuildMember,
    reason: string
  ): Promise<ModerationCaseRow> {
    const guild = interaction.guild!;

    try {
      await target.ban({ reason: `Moderation: ${reason}` });
    } catch (error) {
      logError('Discord ban failed', error);
      throw new Error('Failed to ban the user. Please check bot permissions and role hierarchy.');
    }

    try {
      const modCase = await this.caseRepo.createCase({
        guild_id: guild.id,
        user_id: target.id,
        moderator_id: interaction.user.id,
        type: 'BAN',
        reason,
      });

      await this.logModeration(guild, modCase);
      return modCase;
    } catch (error) {
      logError('Failed to create ban case after successful Discord ban', error);
      throw new DatabaseQueryError('Ban succeeded but failed to record the case. Please log this manually.');
    }
  }

  async unban(
    interaction: ChatInputCommandInteraction,
    userId: string,
    reason: string
  ): Promise<ModerationCaseRow> {
    const guild = interaction.guild!;

    try {
      await guild.members.unban(userId, `Moderation: ${reason}`);
    } catch (error) {
      logError('Discord unban failed', error);
      throw new Error('Failed to unban the user. Make sure the user is banned.');
    }

    try {
      const modCase = await this.caseRepo.createCase({
        guild_id: guild.id,
        user_id: userId,
        moderator_id: interaction.user.id,
        type: 'UNBAN',
        reason,
      });

      await this.logModeration(guild, modCase);
      return modCase;
    } catch (error) {
      logError('Failed to create unban case after successful Discord unban', error);
      throw new DatabaseQueryError('Unban succeeded but failed to record the case.');
    }
  }

  async kick(
    interaction: ChatInputCommandInteraction,
    target: GuildMember,
    reason: string
  ): Promise<ModerationCaseRow> {
    const guild = interaction.guild!;

    try {
      await target.kick(`Moderation: ${reason}`);
    } catch (error) {
      logError('Discord kick failed', error);
      throw new Error('Failed to kick the user. Please check bot permissions and role hierarchy.');
    }

    try {
      const modCase = await this.caseRepo.createCase({
        guild_id: guild.id,
        user_id: target.id,
        moderator_id: interaction.user.id,
        type: 'KICK',
        reason,
      });

      await this.logModeration(guild, modCase);
      return modCase;
    } catch (error) {
      logError('Failed to create kick case after successful Discord kick', error);
      throw new DatabaseQueryError('Kick succeeded but failed to record the case.');
    }
  }

  async timeout(
    interaction: ChatInputCommandInteraction,
    target: GuildMember,
    durationMs: number,
    reason: string
  ): Promise<ModerationCaseRow> {
    const guild = interaction.guild!;
    const expiresAt = new Date(Date.now() + durationMs).toISOString();

    try {
      await target.timeout(durationMs, `Moderation: ${reason}`);
    } catch (error) {
      logError('Discord timeout failed', error);
      throw new Error('Failed to timeout the user. Please check bot permissions and role hierarchy.');
    }

    try {
      const modCase = await this.caseRepo.createCase({
        guild_id: guild.id,
        user_id: target.id,
        moderator_id: interaction.user.id,
        type: 'TIMEOUT',
        reason,
        duration: durationMs,
        expires_at: expiresAt,
      });

      await this.logModeration(guild, modCase);
      return modCase;
    } catch (error) {
      logError('Failed to create timeout case after successful Discord timeout', error);
      throw new DatabaseQueryError('Timeout succeeded but failed to record the case.');
    }
  }

  async untimeout(
    interaction: ChatInputCommandInteraction,
    target: GuildMember,
    reason: string
  ): Promise<ModerationCaseRow> {
    const guild = interaction.guild!;

    try {
      await target.timeout(null, `Moderation: ${reason}`);
    } catch (error) {
      logError('Discord untimeout failed', error);
      throw new Error('Failed to remove timeout from the user.');
    }

    try {
      const modCase = await this.caseRepo.createCase({
        guild_id: guild.id,
        user_id: target.id,
        moderator_id: interaction.user.id,
        type: 'UNTIMEOUT',
        reason,
      });

      await this.logModeration(guild, modCase);
      return modCase;
    } catch (error) {
      logError('Failed to create untimeout case', error);
      throw new DatabaseQueryError('Untimeout succeeded but failed to record the case.');
    }
  }

  async warn(
    interaction: ChatInputCommandInteraction,
    target: GuildMember,
    reason: string
  ): Promise<ModerationCaseRow> {
    const guild = interaction.guild!;

    try {
      const modCase = await this.caseRepo.createCase({
        guild_id: guild.id,
        user_id: target.id,
        moderator_id: interaction.user.id,
        type: 'WARN',
        reason,
      });

      await this.logModeration(guild, modCase);
      return modCase;
    } catch (error) {
      logError('Failed to create warn case', error);
      throw new DatabaseQueryError('Failed to record warning. Please try again.');
    }
  }

  async unwarn(
    interaction: ChatInputCommandInteraction,
    caseId: number,
    reason: string
  ): Promise<ModerationCaseRow | null> {
    const guild = interaction.guild!;

    const revoked = await this.caseRepo.revokeCase(guild.id, caseId, {
      revoked_by: interaction.user.id,
      revoked_reason: reason,
      type: 'WARN',
    });

    if (revoked) {
      await this.logModeration(guild, revoked, 'CASE_REVOKED');
    }

    return revoked;
  }

  async getActiveWarnings(guildId: string, userId: string): Promise<ModerationCaseRow[]> {
    return this.caseRepo.getActiveWarnings(guildId, userId);
  }

  private async logModeration(
    guild: Guild,
    modCase: ModerationCaseRow,
    action: ModerationAction | string = modCase.type as ModerationAction
  ): Promise<void> {
    try {
      await this.caseRepo.supabase.from('logs').insert({
        guild_id: guild.id,
        user_id: modCase.user_id,
        action: `MODERATION_${action}`,
        details: {
          case_id: modCase.case_id,
          case_format: CASE_FORMAT(modCase.case_id),
          type: modCase.type,
          moderator_id: modCase.moderator_id,
          reason: modCase.reason,
          target_id: modCase.user_id,
        },
      });
    } catch (error) {
      logger.warn({ err: error }, 'Failed to write moderation log');
    }
  }

  static formatCaseId(caseId: number): string {
    return CASE_FORMAT(caseId);
  }

  static buildModerationEmbed(
    modCase: ModerationCaseRow,
    targetTag: string,
    moderatorTag: string
  ): EmbedBuilder {
    const actionEmojis: Record<string, string> = {
      BAN: '🔨',
      UNBAN: '🔓',
      KICK: '👢',
      TIMEOUT: '⏰',
      UNTIMEOUT: '🕐',
      WARN: '⚠️',
      UNWARN: '✅',
    };

    const actionColors: Record<string, number> = {
      BAN: Colors.Red,
      UNBAN: Colors.Green,
      KICK: Colors.Orange,
      TIMEOUT: Colors.Yellow,
      UNTIMEOUT: Colors.Blue,
      WARN: Colors.Yellow,
      UNWARN: Colors.Green,
    };

    const emoji = actionEmojis[modCase.type] || '📋';
    const color = actionColors[modCase.type] || Colors.Default;

    const embed = new EmbedBuilder()
      .setTitle(`${emoji} ${modCase.type}`)
      .setColor(color)
      .addFields(
        { name: 'Case', value: CASE_FORMAT(modCase.case_id), inline: true },
        { name: 'Target', value: targetTag, inline: true },
        { name: 'Moderator', value: moderatorTag, inline: true },
        { name: 'Reason', value: modCase.reason || 'No reason provided' }
      )
      .setTimestamp(new Date(modCase.created_at));

    if (modCase.duration) {
      embed.addFields({ name: 'Duration', value: formatDuration(modCase.duration), inline: true });
    }

    if (modCase.expires_at) {
      embed.addFields({
        name: 'Expires',
        value: `<t:${Math.floor(new Date(modCase.expires_at).getTime() / 1000)}:R>`,
        inline: true,
      });
    }

    if (modCase.revoked_by) {
      embed.addFields({ name: 'Revoked by', value: `<@${modCase.revoked_by}>`, inline: true });
      if (modCase.revoked_reason) {
        embed.addFields({ name: 'Revoke Reason', value: modCase.revoked_reason });
      }
    }

    return embed;
  }
}
