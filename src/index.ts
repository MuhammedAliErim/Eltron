import { logger, logError } from './utils/logger';
import { generateErrorId } from './utils/errors';
import { connectDatabase } from './database/connection';
import { EltronClient } from './structures/EltronClient';
import { guildCache } from './utils/cache';
import { GiveawayRepository } from './database/repositories/GiveawayRepository';
import { restoreGiveawayTimers } from './services/giveaway/GiveawayService';
import { restoreEventTimers } from './services/event/EventService';
import { restorePollTimers } from './services/poll/PollService';
import { restoreReminderTimers } from './services/reminder/ReminderService';
import { startApiServer, getApiServer } from './api/server';
import type { Server } from 'http';

let client: EltronClient;
let apiServer: Server | null = null;

const main = async (): Promise<void> => {
  try {
    logger.info('Environment validated successfully');

    await connectDatabase();
    guildCache.startCleanup(300000);

    client = new EltronClient();
    await client.start();

    const giveawayRepo = new GiveawayRepository();
    await restoreGiveawayTimers(giveawayRepo, client);

    await restoreEventTimers();

    await restorePollTimers();

    await restoreReminderTimers(client);

    apiServer = startApiServer();

    logger.info('Eltron Bot is now online!');
  } catch (error) {
    logError('Fatal error during startup', error);
    process.exit(1);
  }
};

const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  guildCache.stopCleanup();

  const forceExitTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timed out after 10s, forcing exit');
    process.exit(1);
  }, 10000);
  forceExitTimeout.unref();

  try {
    if (apiServer) {
      await new Promise<void>((resolve) => {
        apiServer!.close(() => resolve());
      });
    }
  } catch {
    // ignore close errors
  }

  try {
    if (client) {
      await client.shutdown();
    }
  } catch (error) {
    logError('Error during shutdown', error);
  } finally {
    clearTimeout(forceExitTimeout);
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  const errorId = generateErrorId();
  logger.error({ errorId, err: reason }, 'Unhandled Promise Rejection (continuing)');
});

process.on('uncaughtException', (error) => {
  const errorId = generateErrorId();
  logger.error({ errorId, err: error }, 'Uncaught Exception');
  gracefulShutdown('uncaughtException');
});

main();
