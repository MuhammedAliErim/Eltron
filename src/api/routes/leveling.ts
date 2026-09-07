import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { guildGuard } from '../middleware/guildGuard';
import { rateLimits } from '../middleware/rateLimit';
import { LevelRepository } from '../../database/repositories/LevelRepository';
import { parsePagination, sendList, sendData, sendError } from '../utils/response';
import { logError } from '../../utils/logger';

const router = Router();
const levelRepo = new LevelRepository();

router.get(
  '/:id/leveling/leaderboard',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const pagination = parsePagination(req.query as Record<string, unknown>);

    try {
      const leaderboard = await levelRepo.getLeaderboard(guildId, pagination.pageSize);
      const start = (pagination.page - 1) * pagination.pageSize;
      const paginated = leaderboard.slice(start, start + pagination.pageSize);

      sendList(res, paginated, leaderboard.length, pagination);
    } catch (error) {
      logError(`Failed to fetch leaderboard for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch leaderboard', 'LEADERBOARD_FETCH_FAILED');
    }
  }
);

router.get(
  '/:id/leveling/user/:userId',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const userId = req.params.userId as string;

    try {
      const userXP = await levelRepo.getUserXP(guildId, userId);

      if (!userXP) {
        sendError(res, 404, 'User not found in leveling system', 'USER_XP_NOT_FOUND');
        return;
      }

      const rank = await levelRepo.getUserRank(guildId, userId);

      sendData(res, { ...userXP, rank });
    } catch (error) {
      logError(`Failed to fetch XP for user ${userId} in guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch user XP', 'USER_XP_FETCH_FAILED');
    }
  }
);

export default router;
