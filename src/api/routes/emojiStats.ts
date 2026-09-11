import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { guildGuard } from '../middleware/guildGuard';
import { rateLimits } from '../middleware/rateLimit';
import { sendData, sendError } from '../utils/response';
import { logError } from '../../utils/logger';
import { getEmojiStats, getEmojiById } from '../../services/emoji/EmojiStatsService';

const router = Router();

let cachedClient: import('discord.js').Client | null = null;

export function setEmojiStatsClient(client: import('discord.js').Client): void {
  cachedClient = client;
}

router.get(
  '/:id/emoji-stats',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;

    try {
      if (!cachedClient) {
        sendError(res, 503, 'Bot client not available', 'BOT_NOT_READY');
        return;
      }

      const guild = cachedClient.guilds.cache.get(guildId);
      if (!guild) {
        sendError(res, 404, 'Guild not found or bot not present', 'GUILD_NOT_FOUND');
        return;
      }

      const stats = getEmojiStats(guild);
      sendData(res, stats);
    } catch (error) {
      logError(`Failed to fetch emoji stats for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch emoji stats', 'EMOJI_STATS_FAILED');
    }
  }
);

router.get(
  '/:id/emoji-stats/:emojiId',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const emojiId = req.params.emojiId as string;

    try {
      if (!cachedClient) {
        sendError(res, 503, 'Bot client not available', 'BOT_NOT_READY');
        return;
      }

      const guild = cachedClient.guilds.cache.get(guildId);
      if (!guild) {
        sendError(res, 404, 'Guild not found or bot not present', 'GUILD_NOT_FOUND');
        return;
      }

      const emoji = getEmojiById(guild, emojiId);
      if (!emoji) {
        sendError(res, 404, 'Emoji not found', 'EMOJI_NOT_FOUND');
        return;
      }

      sendData(res, emoji);
    } catch (error) {
      logError(`Failed to fetch emoji ${emojiId} for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch emoji details', 'EMOJI_DETAIL_FAILED');
    }
  }
);

export default router;
