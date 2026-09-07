import { ChatInputCommandInteraction } from 'discord.js';
import { BotError, generateErrorId } from '../utils/errors';
import { logger, logError } from '../utils/logger';

export class ErrorGuard {
  static async handle(error: unknown, interaction: ChatInputCommandInteraction): Promise<void> {
    const errorId = generateErrorId();

    if (error instanceof BotError) {
      logger.error(
        { errorId, code: error.code, statusCode: error.statusCode, message: error.message },
        'Command error'
      );
    } else {
      logError('Unexpected command error', error);
    }

    const reply = {
      content: `An error occurred while executing this command. Error ID: \`${errorId}\``,
      ephemeral: true,
    };

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    } catch {
      // Interaction may have expired or been deleted
    }
  }
}
