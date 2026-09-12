import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
  Colors,
  type ChatInputCommandInteraction,
  type GuildMember,
} from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import { BanAppealRepository } from '../../database/repositories/BanAppealRepository';
import { AuditLogService } from '../../services/audit-log/AuditLogService';
import { logger } from '../../utils/logger';

const repo = new BanAppealRepository();

export default class BanAppealCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('banappeal')
    .setDescription('Submit or review ban appeals')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addSubcommand((sub) =>
      sub
        .setName('submit')
        .setDescription('Submit a ban appeal')
        .addStringOption((opt) =>
          opt.setName('reason').setDescription('Why you should be unbanned').setRequired(true).setMaxLength(1000)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('review')
        .setDescription('Review a ban appeal')
        .addStringOption((opt) =>
          opt.setName('id').setDescription('Appeal ID').setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('action')
            .setDescription('Approve or deny')
            .setRequired(true)
            .addChoices(
              { name: 'Approve', value: 'approve' },
              { name: 'Deny', value: 'deny' }
            )
        )
        .addStringOption((opt) =>
          opt.setName('note').setDescription('Review note').setRequired(false).setMaxLength(500)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription('List ban appeals')
        .addStringOption((opt) =>
          opt
            .setName('status')
            .setDescription('Filter by status')
            .setRequired(false)
            .addChoices(
              { name: 'Pending', value: 'pending' },
              { name: 'Approved', value: 'approved' },
              { name: 'Denied', value: 'denied' }
            )
        )
    );

  category = 'Moderation';
  cooldown = 60;
  requiredPermissions = [PermissionFlagsBits.BanMembers];

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    if (!interaction.guild || !interaction.guildId) {
      await interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'submit':
        return this.handleSubmit(interaction);
      case 'review':
        return this.handleReview(interaction);
      case 'list':
        return this.handleList(interaction);
    }
  }

  private async handleSubmit(interaction: ChatInputCommandInteraction): Promise<void> {
    const reason = interaction.options.getString('reason', true);

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const banList = await interaction.guild!.bans.fetch().catch(() => null);
      if (!banList) {
        await interaction.editReply({ content: '❌ Failed to check ban list.' });
        return;
      }

      const banEntry = banList.get(interaction.user.id);
      if (!banEntry) {
        await interaction.editReply({ content: '❌ You are not banned in this server.' });
        return;
      }

      const existing = await repo.getByUser(interaction.guildId!, interaction.user.id);
      const pending = existing.find((a) => a.status === 'pending');
      if (pending) {
        await interaction.editReply({ content: '❌ You already have a pending ban appeal.' });
        return;
      }

      const appeal = await repo.create({
        guild_id: interaction.guildId!,
        user_id: interaction.user.id,
        reason,
      });

      AuditLogService.logModeration(
        interaction.guildId!,
        'ban_appeal_submit',
        interaction.user.id,
        interaction.user.id,
        'Ban appeal submitted'
      );

      const embed = new EmbedBuilder()
        .setTitle('✅ Ban Appeal Submitted')
        .setDescription('Your ban appeal has been submitted and is pending review.')
        .addFields(
          { name: 'Appeal ID', value: appeal.id.substring(0, 8), inline: true },
          { name: 'Status', value: 'Pending', inline: true }
        )
        .setColor(Colors.Blue)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });


    } catch (error) {
      logger.error({ err: error }, 'Error submitting ban appeal');
      await interaction.editReply({ content: '❌ An error occurred while submitting your appeal.' });
    }
  }

  private async handleReview(interaction: ChatInputCommandInteraction): Promise<void> {
    const id = interaction.options.getString('id', true);
    const action = interaction.options.getString('action', true);
    const note = interaction.options.getString('note');

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const appeal = await repo.getById(id);
      if (!appeal) {
        await interaction.editReply({ content: '❌ Appeal not found.' });
        return;
      }

      if (appeal.guild_id !== interaction.guildId!) {
        await interaction.editReply({ content: '❌ Appeal not found in this server.' });
        return;
      }

      const status = action === 'approve' ? 'approved' : 'denied';
      const updated = await repo.review(appeal.id, interaction.user.id, status, note || undefined);

      if (!updated) {
        await interaction.editReply({ content: '❌ Failed to update appeal.' });
        return;
      }

      if (action === 'approve') {
        try {
          await interaction.guild!.members.unban(appeal.user_id, `Ban appeal approved: ${note || 'Approved'}`);
        } catch {
          // user may not be banned anymore
        }
      }

      AuditLogService.logModeration(
        interaction.guildId!,
        'ban_appeal_review',
        interaction.user.id,
        appeal.user_id,
        `Appeal ${status}: ${note || 'No note'}`
      );

      const emoji = action === 'approve' ? '✅' : '❌';
      const embed = new EmbedBuilder()
        .setTitle(`${emoji} Ban Appeal ${status.charAt(0).toUpperCase() + status.slice(1)}`)
        .addFields(
          { name: 'User', value: `<@${appeal.user_id}> (${appeal.user_id})`, inline: true },
          { name: 'Reviewer', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Reason', value: appeal.reason }
        )
        .setColor(action === 'approve' ? Colors.Green : Colors.Red)
        .setTimestamp();

      if (note) {
        embed.addFields({ name: 'Note', value: note });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error({ err: error }, 'Error reviewing ban appeal');
      await interaction.editReply({ content: '❌ An error occurred while reviewing the appeal.' });
    }
  }

  private async handleList(interaction: ChatInputCommandInteraction): Promise<void> {
    const status = interaction.options.getString('status');

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const result = await repo.getByGuild(interaction.guildId!, status || undefined);

      if (result.data.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('📋 Ban Appeals')
          .setDescription('No ban appeals found.')
          .setColor(Colors.Greyple);
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const statusEmoji: Record<string, string> = {
        pending: '⏳',
        approved: '✅',
        denied: '❌',
      };

      const fields = result.data.slice(0, 10).map((appeal) => ({
        name: `${statusEmoji[appeal.status || 'pending'] || '❓'} ${appeal.id.substring(0, 8)}`,
        value: `User: <@${appeal.user_id}>\nStatus: ${appeal.status || 'pending'}\nDate: <t:${Math.floor(new Date(appeal.created_at).getTime() / 1000)}:R>`,
        inline: false,
      }));

      const embed = new EmbedBuilder()
        .setTitle('📋 Ban Appeals')
        .setColor(Colors.Blue)
        .addFields(fields)
        .setFooter({ text: `Total: ${result.total} appeal(s)` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error({ err: error }, 'Error listing ban appeals');
      await interaction.editReply({ content: '❌ An error occurred while listing appeals.' });
    }
  }
}
