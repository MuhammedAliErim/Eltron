import {
  EmbedBuilder,
  Colors,
  type MessageReaction,
  type User,
  type TextChannel,
} from 'discord.js';
import { Event } from '../../structures/Event';
import { EltronClient } from '../../structures/EltronClient';
import { BanAppealRepository } from '../../database/repositories/BanAppealRepository';
import { AuditLogService } from '../../services/audit-log/AuditLogService';
import { logger } from '../../utils/logger';

const repo = new BanAppealRepository();

export default class BanAppealHandler extends Event<'interactionCreate'> {
  name = 'interactionCreate' as const;

  async execute(client: EltronClient, interaction: import('discord.js').Interaction): Promise<void> {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('banappeal:')) return;
    if (!interaction.guildId) return;

    const parts = interaction.customId.split(':');
    if (parts.length !== 3) return;

    const action = parts[1];
    const appealId = parts[2];

    if (action !== 'approve' && action !== 'deny') return;

    try {
      if (!interaction.memberPermissions?.has('BanMembers')) {
        await interaction.reply({ content: '❌ You need the Ban Members permission.', ephemeral: true });
        return;
      }

      const appeal = await repo.getById(appealId);
      if (!appeal) {
        await interaction.reply({ content: '❌ Appeal not found.', ephemeral: true });
        return;
      }

      if (appeal.guild_id !== interaction.guildId) {
        await interaction.reply({ content: '❌ Appeal not found in this server.', ephemeral: true });
        return;
      }

      if (appeal.status !== 'pending') {
        await interaction.reply({ content: '❌ This appeal has already been reviewed.', ephemeral: true });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      const status = action === 'approve' ? 'approved' : 'denied';
      const updated = await repo.review(appeal.id, interaction.user.id, status);

      if (!updated) {
        await interaction.editReply({ content: '❌ Failed to update appeal.' });
        return;
      }

      if (action === 'approve') {
        try {
          await interaction.guild!.members.unban(appeal.user_id, `Ban appeal approved by ${interaction.user.tag}`);
        } catch {
          // user may not be banned anymore
        }
      }

      AuditLogService.logModeration(
        interaction.guildId,
        'ban_appeal_review',
        interaction.user.id,
        appeal.user_id,
        `Appeal ${status} via button`
      );

      const emoji = action === 'approve' ? '✅' : '❌';
      const embed = new EmbedBuilder()
        .setTitle(`${emoji} Ban Appeal ${status.charAt(0).toUpperCase() + status.slice(1)}`)
        .addFields(
          { name: 'User', value: `<@${appeal.user_id}> (${appeal.user_id})`, inline: true },
          { name: 'Reviewer', value: `<@${interaction.user.id}>`, inline: true }
        )
        .setColor(action === 'approve' ? Colors.Green : Colors.Red)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error({ err: error }, 'Error handling ban appeal button');
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '❌ An error occurred.', ephemeral: true });
        }
      } catch {
        // interaction may already be handled
      }
    }
  }
}
