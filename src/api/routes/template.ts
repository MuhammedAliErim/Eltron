import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { guildGuard } from '../middleware/guildGuard';
import { rateLimits } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { exportConfig, importConfig } from '../../services/template/ServerTemplateService';
import { sendData, sendError } from '../utils/response';
import { logError } from '../../utils/logger';

const router = Router();

const importSchema = z.object({
  version: z.string().optional(),
  exportedAt: z.string().optional(),
  sections: z.record(z.string(), z.unknown()),
});

router.get(
  '/:id/template/export',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;

    try {
      const config = await exportConfig(guildId);
      sendData(res, config);
    } catch (error) {
      logError(`Failed to export config for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to export configuration', 'TEMPLATE_EXPORT_FAILED');
    }
  }
);

router.post(
  '/:id/template/import',
  requireAuth,
  guildGuard,
  rateLimits.configPut,
  validate(importSchema, 'body'),
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;

    try {
      const results = await importConfig(guildId, req.body);
      sendData(res, { results });
    } catch (error) {
      logError(`Failed to import config for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to import configuration', 'TEMPLATE_IMPORT_FAILED');
    }
  }
);

export default router;
