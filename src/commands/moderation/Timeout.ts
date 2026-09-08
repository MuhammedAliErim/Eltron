import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import { ModerationService } from '../../services/moderation/ModerationService';
import { ModerationHierarchyService } from '../../services/moderation/ModerationHierarchyService';
import { parseDuration } from '../../utils/duration';
import { ValidationError } from '../../utils/errors';

export default class TimeoutCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Times out a member.')
    .addUserOption((opt) => opt.setName('user').setDescription('The user to timeout').setRequired(true))
    .addStringOption((opt) =>
      opt
        .setName('duration')
        .setDescription('Duration (e.g. 10m, 1h, 7d)')
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for the timeout').setRequired(false).setMaxLength(512)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

  category = 'Moderation';
  cooldown = 5;
  requiredPermissions = [PermissionFlagsBits.ModerateMembers];

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    const targetUser = interaction.options.getUser('user', true);
    const durationInput = interaction.options.getString('duration', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const durationResult = parseDuration(durationInput);
    if (!durationResult.valid) {
      throw new ValidationError(durationResult.error!, 'duration');
    }

    const targetMember = await interaction.guild?.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      await interaction.reply({ content: '❌ User not found in this server.', ephemeral: true });
      return;
    }

    ModerationHierarchyService.checkCanTimeout(interaction, targetMember);

    await interaction.deferReply();

    const service = new ModerationService();
    const modCase = await service.timeout(
      interaction,
      targetMember,
      durationResult.milliseconds!,
      reason
    );

    const embed = ModerationService.buildModerationEmbed(
      modCase,
      `${targetUser.tag} (${targetUser.id})`,
      `${interaction.user.tag}`
    );

    await interaction.editReply({ embeds: [embed] });
  }
}
