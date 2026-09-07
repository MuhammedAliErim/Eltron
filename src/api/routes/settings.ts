import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { guildGuard } from '../middleware/guildGuard';
import { rateLimits } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { GuildRepository } from '../../database/repositories/GuildRepository';
import { sendData, sendError } from '../utils/response';
import { logError } from '../../utils/logger';

const router = Router();
const guildRepo = new GuildRepository();

const settingsSchema = z.object({
  language: z.string().max(10).optional(),
  timezone: z.string().max(50).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

router.get(
  '/:id/settings',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;

    try {
      const guild = await guildRepo.get(guildId);

      if (!guild) {
        sendError(res, 404, 'Guild not found', 'GUILD_NOT_FOUND');
        return;
      }

      sendData(res, {
        guild_id: guild.guild_id,
        language: guild.language,
        timezone: guild.timezone,
        settings: guild.settings,
      });
    } catch (error) {
      logError(`Failed to fetch settings for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch settings', 'SETTINGS_FETCH_FAILED');
    }
  }
);

router.put(
  '/:id/settings',
  requireAuth,
  guildGuard,
  rateLimits.configPut,
  validate(settingsSchema, 'body'),
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;

    try {
      const result = await guildRepo.updateSettings(guildId, req.body);

      if (!result) {
        sendError(res, 404, 'Guild not found', 'GUILD_NOT_FOUND');
        return;
      }

      sendData(res, {
        guild_id: result.guild_id,
        language: result.language,
        timezone: result.timezone,
        settings: result.settings,
      });
    } catch (error) {
      logError(`Failed to update settings for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to update settings', 'SETTINGS_UPDATE_FAILED');
    }
  }
);

export default router;
