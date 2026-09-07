import { REST, Routes } from 'discord.js';
import { logger, logError } from '../utils/logger';
import { env } from '../config/env';
import { EltronClient } from '../structures/EltronClient';

export const deployCommands = async (client: EltronClient): Promise<void> => {
  try {
    const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);

    const commands = client.commands.map((command) => command.data.toJSON());

    logger.info(`Deploying ${commands.length} commands...`);

    const data = (await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), {
      body: commands,
    })) as unknown[];

    logger.info(`Successfully deployed ${data.length} commands`);
  } catch (error) {
    logError('Failed to deploy commands', error);
  }
};
