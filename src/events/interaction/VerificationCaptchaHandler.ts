import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags,
} from 'discord.js';
import { Event } from '../../structures/Event';
import { EltronClient } from '../../structures/EltronClient';
import { VerificationRepository } from '../../database/repositories/VerificationRepository';
import { getVerificationConfigWithCache } from '../../services/security/VerificationConfig';
import {
  generateCaptcha,
  generateMathCaptcha,
  verifyCaptcha,
  verifyMathCaptcha,
} from '../../services/verification/CaptchaService';
import { handleButtonVerification } from '../../services/security/VerificationService';
import { logger } from '../../utils/logger';

const repo = new VerificationRepository();

export default class VerificationCaptchaHandler extends Event<'interactionCreate'> {
  name = 'interactionCreate' as const;

  async execute(client: EltronClient, interaction: import('discord.js').Interaction): Promise<void> {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('verify:')) return;
    if (!interaction.guildId) return;

    const parts = interaction.customId.split(':');
    if (parts.length !== 3) return;

    const guildId = parts[1];
    const userId = parts[2];

    if (interaction.user.id !== userId) {
      await interaction.reply({
        content: 'This verification is not for you.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      const member = await interaction.guild?.members.fetch(userId);
      if (!member) {
        await interaction.reply({
          content: 'Could not find you in this server.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const config = await getVerificationConfigWithCache(
        guildId,
        (gid) => repo.getConfig(gid)
      );

      if (!config.enabled) {
        await interaction.reply({
          content: 'Verification is currently disabled.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const configAny = config as any;
      const captchaEnabled = configAny.captcha_enabled as boolean | undefined;
      const captchaMethod = configAny.captcha_method as string | undefined;

      if (captchaEnabled) {
        const method = captchaMethod || 'math';

        if (method === 'code') {
          const { display } = generateCaptcha(guildId, userId);

          const modal = new ModalBuilder()
            .setCustomId(`captcha_code:${guildId}:${userId}`)
            .setTitle('Verification Captcha')
            .addComponents(
              new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                  .setCustomId('captcha_input')
                  .setLabel('Enter the verification code')
                  .setPlaceholder('Type the code shown above')
                  .setStyle(TextInputStyle.Short)
                  .setRequired(true)
                  .setMaxLength(10)
              )
            );

          await interaction.reply({ content: display, flags: MessageFlags.Ephemeral });
          await interaction.showModal(modal);
          return;
        } else {
          const { question } = generateMathCaptcha(guildId, userId);

          const modal = new ModalBuilder()
            .setCustomId(`captcha_math:${guildId}:${userId}`)
            .setTitle('Verification Math')
            .addComponents(
              new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                  .setCustomId('captcha_answer')
                  .setLabel('Enter your answer')
                  .setPlaceholder('Type the number')
                  .setStyle(TextInputStyle.Short)
                  .setRequired(true)
                  .setMaxLength(10)
              )
            );

          await interaction.reply({ content: question, flags: MessageFlags.Ephemeral });
          await interaction.showModal(modal);
          return;
        }
      }

      const result = await handleButtonVerification(member, config);

      if (result.state === 'VERIFIED') {
        await interaction.reply({
          content: result.message,
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: result.message,
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (error) {
      logger.error({
        err: error,
        guildId,
        userId,
      }, 'Error in verification captcha handler');

      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: 'An error occurred during verification.',
            flags: MessageFlags.Ephemeral,
          });
        }
      } catch {
        // interaction may already be handled
      }
    }
  }
}
