import { Router, Request, Response } from 'express';
import { sendData, sendError } from '../utils/response';
import { logError } from '../../utils/logger';

const router = Router();

let cachedClient: import('discord.js').Client | null = null;

export function setBotStatusClient(client: import('discord.js').Client): void {
  cachedClient = client;
}

router.get('/', (_req: Request, res: Response) => {
  try {
    if (!cachedClient) {
      sendError(res, 503, 'Bot client not available', 'BOT_NOT_READY');
      return;
    }

    const mem = process.memoryUsage();
    const uptime = Math.floor(process.uptime());
    const ping = cachedClient.ws.ping;

    const guildCount = cachedClient.guilds.cache.size;
    const userCount = cachedClient.users.cache.size;

    let commandCount = 0;
    if ('commands' in cachedClient) {
      commandCount = (cachedClient as { commands: { size: number } }).commands.size;
    }

    sendData(res, {
      uptime,
      guilds: guildCount,
      users: userCount,
      commands: commandCount,
      memory: {
        used: Math.round(mem.heapUsed / 1024 / 1024),
        total: Math.round(mem.heapTotal / 1024 / 1024),
      },
      ping,
      nodeVersion: process.version,
      discordJsVersion: require('discord.js').version,
      gatewayStatus: cachedClient.isReady() ? 'connected' : 'disconnected',
    });
  } catch (error) {
    logError('Failed to fetch bot status', error);
    sendError(res, 500, 'Failed to fetch bot status', 'BOT_STATUS_FAILED');
  }
});

export default router;
