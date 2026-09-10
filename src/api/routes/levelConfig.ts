import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { guildGuard } from '../middleware/guildGuard';
import { rateLimits } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { LevelConfigRepository } from '../../database/repositories/LevelConfigRepository';
import { sendData, sendError } from '../utils/response';
import { logError } from '../../utils/logger';

const router = Router();
const levelConfigRepo = new LevelConfigRepository();

const levelingConfigSchema = z.object({
  enabled: z.boolean().optional(),
  xpPerMessage: z.number().min(1).max(100).optional(),
  cooldownSeconds: z.number().min(0).max(3600).optional(),
  levelUpMessage: z.string().max(2000).optional(),
  levelUpChannel: z.string().nullable().optional(),
  levelUpEmbed: z.boolean().optional(),
  xpMultiplier: z.number().min(0.5).max(5).optional(),
});

const roleRewardSchema = z.object({
  level: z.number().int().min(1).max(999),
  role_id: z.string().min(1),
});

router.get(
  '/:id/leveling/config',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;

    try {
      const config = await levelConfigRepo.getConfig(guildId);
      sendData(res, config);
    } catch (error) {
      logError(`Failed to fetch leveling config for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch leveling config', 'LEVELING_CONFIG_FETCH_FAILED');
    }
  }
);

router.put(
  '/:id/leveling/config',
  requireAuth,
  guildGuard,
  rateLimits.configPut,
  validate(levelingConfigSchema, 'body'),
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;

    try {
      const config = await levelConfigRepo.updateConfig(guildId, req.body);
      sendData(res, config);
    } catch (error) {
      logError(`Failed to update leveling config for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to update leveling config', 'LEVELING_CONFIG_UPDATE_FAILED');
    }
  }
);

router.get(
  '/:id/leveling/rewards',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;

    try {
      const rewards = await levelConfigRepo.getRoleRewards(guildId);
      sendData(res, rewards);
    } catch (error) {
      logError(`Failed to fetch role rewards for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch role rewards', 'LEVELING_REWARDS_FETCH_FAILED');
    }
  }
);

router.post(
  '/:id/leveling/rewards',
  requireAuth,
  guildGuard,
  rateLimits.configPut,
  validate(roleRewardSchema, 'body'),
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const { level, role_id } = req.body;

    try {
      const reward = await levelConfigRepo.addRoleReward(guildId, level, role_id);
      sendData(res, reward);
    } catch (error) {
      logError(`Failed to add role reward for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to add role reward', 'LEVELING_REWARD_ADD_FAILED');
    }
  }
);

router.delete(
  '/:id/leveling/rewards/:level',
  requireAuth,
  guildGuard,
  rateLimits.configPut,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const level = parseInt(req.params.level as string, 10);

    if (isNaN(level)) {
      sendError(res, 400, 'Invalid level', 'VALIDATION_ERROR');
      return;
    }

    try {
      await levelConfigRepo.removeRoleReward(guildId, level);
      sendData(res, { success: true });
    } catch (error) {
      logError(`Failed to remove role reward for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to remove role reward', 'LEVELING_REWARD_REMOVE_FAILED');
    }
  }
);

export default router;
