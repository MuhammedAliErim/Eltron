import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { guildGuard } from '../middleware/guildGuard';
import { rateLimits } from '../middleware/rateLimit';
import { sendData, sendError } from '../utils/response';
import { logError } from '../../utils/logger';

const router = Router({ mergeParams: true });

router.get(
  '/:id/counting/config',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;

    try {
      const { getSupabaseAdmin } = await import('../../database/connection');
      const supabase = getSupabaseAdmin();

      const { data, error } = await supabase
        .from('counting_config')
        .select('*')
        .eq('guild_id', guildId)
        .single();

      if (error && error.code === 'PGRST116') {
        const { data: created, error: createError } = await supabase
          .from('counting_config')
          .insert({ guild_id: guildId })
          .select()
          .single();

        if (createError) throw createError;
        sendData(res, created);
        return;
      }

      if (error) throw error;

      sendData(res, data);
    } catch (error) {
      logError(`Failed to fetch counting config for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch counting config', 'COUNTING_CONFIG_FETCH_FAILED');
    }
  }
);

router.put(
  '/:id/counting/config',
  requireAuth,
  guildGuard,
  rateLimits.configPut,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const { channel_id, enabled, current_number } = req.body;

    try {
      const { getSupabaseAdmin } = await import('../../database/connection');
      const supabase = getSupabaseAdmin();

      const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (channel_id !== undefined) updatePayload.channel_id = channel_id || null;
      if (enabled !== undefined) updatePayload.enabled = enabled;
      if (current_number !== undefined) updatePayload.current_number = current_number;

      const { data, error } = await supabase
        .from('counting_config')
        .update(updatePayload)
        .eq('guild_id', guildId)
        .select()
        .single();

      if (error && error.code === 'PGRST116') {
        const { data: created, error: createError } = await supabase
          .from('counting_config')
          .insert({ guild_id: guildId, ...updatePayload })
          .select()
          .single();

        if (createError) throw createError;
        sendData(res, created);
        return;
      }

      if (error) throw error;

      sendData(res, data);
    } catch (error) {
      logError(`Failed to update counting config for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to update counting config', 'COUNTING_CONFIG_UPDATE_FAILED');
    }
  }
);

router.get(
  '/:id/counting/scores',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;

    try {
      const { getSupabaseAdmin } = await import('../../database/connection');
      const supabase = getSupabaseAdmin();

      const { data, error } = await supabase
        .from('counting_scores')
        .select('*')
        .eq('guild_id', guildId)
        .order('score', { ascending: false })
        .limit(100);

      if (error) throw error;

      sendData(res, data || []);
    } catch (error) {
      logError(`Failed to fetch counting scores for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch counting scores', 'COUNTING_SCORES_FETCH_FAILED');
    }
  }
);

export default router;
