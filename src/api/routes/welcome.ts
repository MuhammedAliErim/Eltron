import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { guildGuard } from '../middleware/guildGuard';
import { rateLimits } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { WelcomeRepository } from '../../database/repositories/WelcomeRepository';
import { sendData, sendError } from '../utils/response';
import { logError } from '../../utils/logger';

const router = Router();
const welcomeRepo = new WelcomeRepository();

const welcomeConfigSchema = z.object({
  enabled: z.boolean().optional(),
  channel_id: z.string().optional(),
  welcome_message: z.string().max(2000).optional(),
  dm_message: z.string().max(2000).optional(),
  auto_role_id: z.string().optional(),
  embed_enabled: z.boolean().optional(),
  embed_color: z.string().optional(),
  embed_title: z.string().optional(),
  embed_description: z.string().max(4000).optional(),
  embed_thumbnail: z.boolean().optional(),
  goodbye_enabled: z.boolean().optional(),
  goodbye_channel_id: z.string().optional(),
  goodbye_message: z.string().max(2000).optional(),
  goodbye_embed_enabled: z.boolean().optional(),
});

router.get(
  '/:id/welcome/config',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;

    try {
      const config = await welcomeRepo.getConfig(guildId);
      sendData(res, config);
    } catch (error) {
      logError(`Failed to fetch welcome config for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch welcome config', 'WELCOME_CONFIG_FETCH_FAILED');
    }
  }
);

router.put(
  '/:id/welcome/config',
  requireAuth,
  guildGuard,
  rateLimits.configPut,
  validate(welcomeConfigSchema, 'body'),
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;

    try {
      const config = await welcomeRepo.upsertConfig(guildId, req.body);
      sendData(res, config);
    } catch (error) {
      logError(`Failed to update welcome config for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to update welcome config', 'WELCOME_CONFIG_UPDATE_FAILED');
    }
  }
);

export default router;
