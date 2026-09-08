import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import { ModerationService } from '../../services/moderation/ModerationService';
import { ValidationGuard } from '../../middleware/ValidationGuard';
import { snowflakeSchema } from '../../utils/validation';

export default class UnbanCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unbans a user from the server.')
    .addStringOption((opt) =>
      opt.setName('user_id').setDescription('The user ID to unban').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for the unban').setRequired(false).setMaxLength(512)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

  category = 'Moderation';
  cooldown = 5;
  requiredPermissions = [PermissionFlagsBits.BanMembers];

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    const userId = interaction.options.getString('user_id', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    ValidationGuard.validate(snowflakeSchema, userId);

    await interaction.deferReply();

    const service = new ModerationService();
    const modCase = await service.unban(interaction, userId, reason);

    const embed = ModerationService.buildModerationEmbed(
      modCase,
      userId,
      `${interaction.user.tag}`
    );

    await interaction.editReply({ embeds: [embed] });
  }
}
