import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { guildGuard } from '../middleware/guildGuard';
import { rateLimits } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { AutomodRepository } from '../../database/repositories/AutomodRepository';
import { sendData, sendError } from '../utils/response';
import { logError } from '../../utils/logger';

const router = Router();
const automodRepo = new AutomodRepository();

const automodConfigSchema = z.object({
  enabled: z.boolean().optional(),
  max_mentions: z.number().int().min(0).max(100).optional(),
  max_links: z.number().int().min(0).max(50).optional(),
  max_invites: z.number().int().min(0).max(50).optional(),
  max_emojis: z.number().int().min(0).max(100).optional(),
  max_words: z.number().int().min(0).max(100).optional(),
  anti_mass_mention_enabled: z.boolean().optional(),
  anti_mass_mention_threshold: z.number().int().min(0).max(200).optional(),
  link_filter_enabled: z.boolean().optional(),
  blocked_links: z.array(z.string()).optional(),
  invite_filter_enabled: z.boolean().optional(),
  spam_protection_enabled: z.boolean().optional(),
  spam_time_window: z.number().int().min(0).max(300).optional(),
  spam_message_limit: z.number().int().min(0).max(50).optional(),
});

router.get(
  '/:id/automod/config',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;

    try {
      const config = await automodRepo.getConfig(guildId);
      sendData(res, config || { guild_id: guildId, enabled: false });
    } catch (error) {
      logError(`Failed to fetch automod config for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch automod config', 'AUTOMOD_CONFIG_FETCH_FAILED');
    }
  }
);

router.put(
  '/:id/automod/config',
  requireAuth,
  guildGuard,
  rateLimits.configPut,
  validate(automodConfigSchema, 'body'),
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;

    try {
      const config = await automodRepo.updateConfig(guildId, req.body);

      if (!config) {
        sendError(res, 404, 'Config not found', 'AUTOMOD_CONFIG_NOT_FOUND');
        return;
      }

      sendData(res, config);
    } catch (error) {
      logError(`Failed to update automod config for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to update automod config', 'AUTOMOD_CONFIG_UPDATE_FAILED');
    }
  }
);

router.get(
  '/:id/automod/rules',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;

    try {
      const rules = await automodRepo.getGuildRules(guildId);
      sendData(res, rules);
    } catch (error) {
      const errObj = error as Record<string, unknown>;
      logError(`[DEBUG automod/rules] guild=${guildId} code=${errObj.code} message=${errObj.message} details=${errObj.details} hint=${errObj.hint}`, error);
      sendError(res, 500, 'Failed to fetch automod rules', 'AUTOMOD_RULES_FETCH_FAILED');
    }
  }
);

export default router;
