import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import { ModerationService } from '../../services/moderation/ModerationService';
import { AuditLogService } from '../../services/audit-log/AuditLogService';
import { ValidationGuard } from '../../middleware/ValidationGuard';
import { z } from 'zod';

const caseIdSchema = z.coerce.number().int().positive('Case ID must be a positive number.');

export default class UnwarnCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('unwarn')
    .setDescription('Revokes a warning case.')
    .addIntegerOption((opt) =>
      opt.setName('case_id').setDescription('The case number to revoke').setRequired(true).setMinValue(1)
    )
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for revoking').setRequired(false).setMaxLength(512)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

  category = 'Moderation';
  cooldown = 5;
  requiredPermissions = [PermissionFlagsBits.ModerateMembers];

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    const caseId = interaction.options.getInteger('case_id', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    ValidationGuard.validate(caseIdSchema, caseId);

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const service = new ModerationService();
    const revoked = await service.unwarn(interaction, caseId, reason);

    if (!revoked) {
      await interaction.editReply({
        content: `❌ Case CASE-${String(caseId).padStart(6, '0')} not found or already revoked.`,
      });
      return;
    }

    AuditLogService.logModeration(interaction.guildId!, 'unwarn', interaction.user.id, revoked.user_id, 'Warning removed');

    const embed = ModerationService.buildModerationEmbed(
      revoked,
      revoked.user_id,
      `${interaction.user.tag}`
    );

    await interaction.editReply({ embeds: [embed] });
  }
}
