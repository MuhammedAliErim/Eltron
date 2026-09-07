import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { guildGuard } from '../middleware/guildGuard';
import { rateLimits } from '../middleware/rateLimit';
import { GiveawayRepository } from '../../database/repositories/GiveawayRepository';
import { parsePagination, sendList, sendData, sendError } from '../utils/response';
import { logError } from '../../utils/logger';

const router = Router();
const giveawayRepo = new GiveawayRepository();

router.get(
  '/:id/giveaways',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;

    try {
      const giveaways = await giveawayRepo.listGuildGiveaways(guildId, status, 1000);
      const total = giveaways.length;
      const start = (pagination.page - 1) * pagination.pageSize;
      const paginated = giveaways.slice(start, start + pagination.pageSize);

      sendList(res, paginated, total, pagination);
    } catch (error) {
      logError(`Failed to fetch giveaways for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch giveaways', 'GIVEAWAYS_FETCH_FAILED');
    }
  }
);

router.get(
  '/:id/giveaways/:giveawayId',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const giveawayId = parseInt(req.params.giveawayId as string, 10);

    if (isNaN(giveawayId)) {
      sendError(res, 400, 'Invalid giveaway ID', 'INVALID_GIVEAWAY_ID');
      return;
    }

    try {
      const giveaway = await giveawayRepo.getGiveaway(giveawayId);

      if (!giveaway || giveaway.guild_id !== guildId) {
        sendError(res, 404, 'Giveaway not found', 'GIVEAWAY_NOT_FOUND');
        return;
      }

      const [entries, winners] = await Promise.all([
        giveawayRepo.getEntries(giveawayId),
        giveawayRepo.getWinners(giveawayId),
      ]);

      sendData(res, { ...giveaway, entries, winners });
    } catch (error) {
      logError(`Failed to fetch giveaway ${giveawayId} for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch giveaway', 'GIVEAWAY_FETCH_FAILED');
    }
  }
);

export default router;
