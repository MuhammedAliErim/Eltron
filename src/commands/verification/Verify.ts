import {
  SlashCommandBuilder,
  MessageFlags,
} from 'discord.js';
import { Command } from '../../structures/Command';
import type { CommandExecuteOptions } from '../../structures/Command';
import { VerificationRepository } from '../../database/repositories/VerificationRepository';
import { getVerificationConfigWithCache } from '../../services/security/VerificationConfig';
import {
  startVerification,
  submitVerification,
  createVerificationEmbed,
} from '../../services/security/VerificationService';

const repo = new VerificationRepository();

export default class VerifyCommand extends Command {
  data = new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Verify yourself to access the server')
    .addStringOption((opt) =>
      opt.setName('code').setDescription('Verification code (if required)').setRequired(false)
    );

  category = 'Security';
  cooldown = 10;

  async execute({ interaction }: CommandExecuteOptions): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const config = await getVerificationConfigWithCache(
      interaction.guildId!,
      (guildId) => repo.getConfig(guildId)
    );

    if (!config.enabled) {
      await interaction.editReply({ content: 'Verification is currently disabled.' });
      return;
    }

    const member = interaction.member;
    if (!member || !('roles' in member)) {
      await interaction.editReply({ content: 'Could not verify your identity.' });
      return;
    }

    const guildMember = member as import('discord.js').GuildMember;
    const code = interaction.options.getString('code');

    if (code) {
      const result = await submitVerification(guildMember, config, code);
      await interaction.editReply({ content: result.message });
      return;
    }

    const result = await startVerification(guildMember, config);

    if (result.state === 'VERIFIED') {
      await interaction.editReply({ content: result.message });
      return;
    }

    if (!result.challenge) {
      await interaction.editReply({ content: result.message });
      return;
    }

    const { embed, row } = createVerificationEmbed(guildMember, config, result.challenge);

    if (row) {
      await interaction.editReply({ embeds: [embed], components: [row] });
    } else {
      await interaction.editReply({ embeds: [embed] });
    }
  }
}
