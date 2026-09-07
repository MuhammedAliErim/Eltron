import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, Colors } from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import { ModerationService } from '../../services/moderation/ModerationService';
import { ModerationCaseRow } from '../../database/schema';

export default class WarningsCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Shows active warnings for a user.')
    .addUserOption((opt) =>
      opt.setName('user').setDescription('The user to check warnings for').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

  cooldown = 5;
  requiredPermissions = [PermissionFlagsBits.ModerateMembers];

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    const targetUser = interaction.options.getUser('user', true);

    await interaction.deferReply({ ephemeral: true });

    const service = new ModerationService();
    const warnings = await service.getActiveWarnings(interaction.guildId!, targetUser.id);

    if (warnings.length === 0) {
      await interaction.editReply({
        content: `✅ ${targetUser.tag} has no active warnings.`,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`⚠️ Active Warnings — ${targetUser.tag}`)
      .setColor(Colors.Yellow)
      .setDescription(`**${warnings.length}** active warning(s)`)
      .setThumbnail(targetUser.displayAvatarURL());

    const warningList = warnings.slice(0, 25).map((w: ModerationCaseRow) => {
      const caseFormat = `CASE-${String(w.case_id).padStart(6, '0')}`;
      const date = `<t:${Math.floor(new Date(w.created_at).getTime() / 1000)}:R>`;
      return `**${caseFormat}** — ${date}\n> ${w.reason || 'No reason'}`;
    });

    embed.addFields({ name: 'Warnings', value: warningList.join('\n\n') });

    if (warnings.length > 25) {
      embed.setFooter({ text: `Showing 25 of ${warnings.length} warnings` });
    }

    await interaction.editReply({ embeds: [embed] });
  }
}
