import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { guildGuard } from '../middleware/guildGuard';
import { rateLimits } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { AntiRaidRepository } from '../../database/repositories/AntiRaidRepository';
import { QuarantineRepository } from '../../database/repositories/QuarantineRepository';
import { VerificationRepository } from '../../database/repositories/VerificationRepository';
import { ChannelWarningRepository } from '../../database/repositories/ChannelWarningRepository';
import { sendData, sendError } from '../utils/response';
import { logError } from '../../utils/logger';

const router = Router();
const antiRaidRepo = new AntiRaidRepository();
const quarantineRepo = new QuarantineRepository();
const verificationRepo = new VerificationRepository();
const channelWarningRepo = new ChannelWarningRepository();

const antiRaidSchema = z.object({
  enabled: z.boolean().optional(),
  detection_enabled: z.boolean().optional(),
  max_joins_per_minute: z.number().int().min(1).max(100).optional(),
  max_joins_per_5_minutes: z.number().int().min(1).max(500).optional(),
  action: z.enum(['NONE', 'KICK', 'BAN', 'QUARANTINE']).optional(),
  alert_channel_id: z.string().optional(),
  exempt_roles: z.array(z.string()).optional(),
  exempt_users: z.array(z.string()).optional(),
});

const quarantineSchema = z.object({
  enabled: z.boolean().optional(),
  default_duration: z.number().int().min(0).max(2592000).optional(),
  role_id: z.string().optional(),
  auto_release: z.boolean().optional(),
  release_role_id: z.string().optional(),
  log_channel_id: z.string().optional(),
});

const verificationSchema = z.object({
  enabled: z.boolean().optional(),
  method: z.enum(['BUTTON', 'REACTION', 'CAPTCHA', 'QUESTION']).optional(),
  role_id: z.string().optional(),
  log_channel_id: z.string().optional(),
  welcome_message: z.string().max(2000).optional(),
  verification_channel_id: z.string().optional(),
  questions: z.array(z.string()).optional(),
  timeout_minutes: z.number().int().min(1).max(1440).optional(),
});

const channelWarningSchema = z.object({
  enabled: z.boolean().optional(),
  max_slowmode: z.number().int().min(0).max(21600).optional(),
  slowmode_increment: z.number().int().min(1).max(21600).optional(),
  alert_threshold: z.number().int().min(1).max(50).optional(),
  exempt_roles: z.array(z.string()).optional(),
  exempt_channels: z.array(z.string()).optional(),
  log_channel_id: z.string().optional(),
});

router.get(
  '/:id/security/config',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;

    try {
      const [antiRaid, quarantine, verification, channelWarning] = await Promise.all([
        antiRaidRepo.getConfig(guildId),
        quarantineRepo.getConfig(guildId),
        verificationRepo.getConfig(guildId),
        channelWarningRepo.getConfig(guildId),
      ]);

      sendData(res, {
        antiRaid: antiRaid || { guild_id: guildId, enabled: false },
        quarantine: quarantine || { guild_id: guildId, enabled: false },
        verification: verification || { guild_id: guildId, enabled: false },
        channelWarning: channelWarning || { guild_id: guildId, enabled: false },
      });
    } catch (error) {
      logError(`Failed to fetch security config for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch security config', 'SECURITY_CONFIG_FETCH_FAILED');
    }
  }
);

router.put(
  '/:id/security/antiraid',
  requireAuth,
  guildGuard,
  rateLimits.configPut,
  validate(antiRaidSchema, 'body'),
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;

    try {
      const config = await antiRaidRepo.updateConfig(guildId, req.body);

      if (!config) {
        sendError(res, 404, 'Config not found', 'ANTI_RAID_CONFIG_NOT_FOUND');
        return;
      }

      sendData(res, config);
    } catch (error) {
      logError(`Failed to update anti-raid config for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to update anti-raid config', 'ANTI_RAID_CONFIG_UPDATE_FAILED');
    }
  }
);

router.put(
  '/:id/security/quarantine',
  requireAuth,
  guildGuard,
  rateLimits.configPut,
  validate(quarantineSchema, 'body'),
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;

    try {
      const config = await quarantineRepo.updateConfig(guildId, req.body);

      if (!config) {
        sendError(res, 404, 'Config not found', 'QUARANTINE_CONFIG_NOT_FOUND');
        return;
      }

      sendData(res, config);
    } catch (error) {
      logError(`Failed to update quarantine config for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to update quarantine config', 'QUARANTINE_CONFIG_UPDATE_FAILED');
    }
  }
);

router.put(
  '/:id/security/verification',
  requireAuth,
  guildGuard,
  rateLimits.configPut,
  validate(verificationSchema, 'body'),
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;

    try {
      const config = await verificationRepo.updateConfig(guildId, req.body);

      if (!config) {
        sendError(res, 404, 'Config not found', 'VERIFICATION_CONFIG_NOT_FOUND');
        return;
      }

      sendData(res, config);
    } catch (error) {
      logError(`Failed to update verification config for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to update verification config', 'VERIFICATION_CONFIG_UPDATE_FAILED');
    }
  }
);

router.put(
  '/:id/security/channelwarning',
  requireAuth,
  guildGuard,
  rateLimits.configPut,
  validate(channelWarningSchema, 'body'),
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;

    try {
      const config = await channelWarningRepo.updateConfig(guildId, req.body);

      if (!config) {
        sendError(res, 404, 'Config not found', 'CHANNEL_WARNING_CONFIG_NOT_FOUND');
        return;
      }

      sendData(res, config);
    } catch (error) {
      logError(`Failed to update channel warning config for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to update channel warning config', 'CHANNEL_WARNING_CONFIG_UPDATE_FAILED');
    }
  }
);

router.get(
  '/:id/security/quarantine/logs',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;

    try {
      const { getSupabaseAdmin } = await import('../../database/connection');
      const supabase = getSupabaseAdmin();

      const { data, error } = await supabase
        .from('quarantine_logs')
        .select('*')
        .eq('guild_id', guildId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      sendData(res, data || []);
    } catch (error) {
      logError(`Failed to fetch quarantine logs for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch quarantine logs', 'QUARANTINE_LOGS_FETCH_FAILED');
    }
  }
);

export default router;
