import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { guildGuard } from '../middleware/guildGuard';
import { rateLimits } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { RoleRepository } from '../../database/repositories/RoleRepository';
import { sendData, sendError } from '../utils/response';
import { logError } from '../../utils/logger';

const router = Router();
const roleRepo = new RoleRepository();

const autoRoleSchema = z.object({
  enabled: z.boolean().optional(),
  role_id: z.string().nullable().optional(),
});

router.get(
  '/:id/roles/autorole',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;

    try {
      const config = await roleRepo.getAutoRoleConfig(guildId);
      sendData(res, config);
    } catch (error) {
      logError(`Failed to fetch auto-role config for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch auto-role config', 'AUTOROLE_CONFIG_FETCH_FAILED');
    }
  }
);

router.put(
  '/:id/roles/autorole',
  requireAuth,
  guildGuard,
  rateLimits.configPut,
  validate(autoRoleSchema, 'body'),
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;

    try {
      const config = await roleRepo.upsertAutoRoleConfig(guildId, req.body);
      sendData(res, config);
    } catch (error) {
      logError(`Failed to update auto-role config for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to update auto-role config', 'AUTOROLE_CONFIG_UPDATE_FAILED');
    }
  }
);

export default router;
