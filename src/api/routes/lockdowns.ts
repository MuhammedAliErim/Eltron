import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { guildGuard } from '../middleware/guildGuard';
import { rateLimits } from '../middleware/rateLimit';
import { LockdownRepository } from '../../database/repositories/LockdownRepository';
import { sendData, sendError } from '../utils/response';
import { logError } from '../../utils/logger';

const router = Router();
const lockdownRepo = new LockdownRepository();

router.get(
  '/:guildId/lockdowns',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.guildId as string;

    try {
      const lockdowns = await lockdownRepo.getByGuild(guildId);
      sendData(res, lockdowns);
    } catch (error) {
      logError(`Failed to fetch lockdowns for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch lockdowns', 'LOCKDOWN_FETCH_FAILED');
    }
  }
);

router.post(
  '/:guildId/lockdowns/lock',
  requireAuth,
  guildGuard,
  rateLimits.configPut,
  async (req: Request, res: Response) => {
    const guildId = req.params.guildId as string;
    const { channelId, reason, autoUnlockMinutes, unlockAt } = req.body as {
      channelId: string;
      reason?: string;
      autoUnlockMinutes?: number;
      unlockAt?: string;
    };
    const userId = req.session?.userId ?? 'api';

    if (!channelId) {
      sendError(res, 400, 'channelId is required', 'MISSING_CHANNEL_ID');
      return;
    }

    try {
      const existing = await lockdownRepo.getByChannel(channelId);
      if (existing) {
        sendError(res, 409, 'Channel is already locked down', 'ALREADY_LOCKED');
        return;
      }

      const lockdown = await lockdownRepo.create({
        guild_id: guildId,
        channel_id: channelId,
        locked_by: userId,
        reason: reason ?? 'Server lockdown',
        auto_unlock_minutes: autoUnlockMinutes ?? 0,
        unlock_at: unlockAt ?? null,
      });

      sendData(res, lockdown);
    } catch (error) {
      logError(`Failed to create lockdown for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to create lockdown', 'LOCKDOWN_CREATE_FAILED');
    }
  }
);

router.post(
  '/:guildId/lockdowns/unlock',
  requireAuth,
  guildGuard,
  rateLimits.configPut,
  async (req: Request, res: Response) => {
    const guildId = req.params.guildId as string;
    const { channelId } = req.body as { channelId: string };

    if (!channelId) {
      sendError(res, 400, 'channelId is required', 'MISSING_CHANNEL_ID');
      return;
    }

    try {
      const lockdown = await lockdownRepo.getByChannel(channelId);
      if (!lockdown) {
        sendError(res, 404, 'Channel is not locked down', 'NOT_LOCKED');
        return;
      }

      await lockdownRepo.delete(channelId);
      sendData(res, { success: true });
    } catch (error) {
      logError(`Failed to unlock channel ${channelId} in guild ${guildId}`, error);
      sendError(res, 500, 'Failed to unlock channel', 'LOCKDOWN_DELETE_FAILED');
    }
  }
);

export default router;
