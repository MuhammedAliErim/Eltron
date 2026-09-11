import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { guildGuard } from '../middleware/guildGuard';
import { rateLimits } from '../middleware/rateLimit';
import { sendData, sendError } from '../utils/response';
import { logError } from '../../utils/logger';

const router = Router({ mergeParams: true });

router.get(
  '/:id/stats-channels',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;

    try {
      const { getSupabaseAdmin } = await import('../../database/connection');
      const supabase = getSupabaseAdmin();

      const { data, error } = await supabase
        .from('stats_channels')
        .select('*')
        .eq('guild_id', guildId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      sendData(res, data || []);
    } catch (error) {
      logError(`Failed to fetch stats channels for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch stats channels', 'STATS_CHANNELS_FETCH_FAILED');
    }
  }
);

router.post(
  '/:id/stats-channels',
  requireAuth,
  guildGuard,
  rateLimits.configPut,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const { channel_id, type, format } = req.body;

    if (!channel_id || !type) {
      sendError(res, 400, 'Channel ID and type are required', 'VALIDATION_ERROR');
      return;
    }

    try {
      const { getSupabaseAdmin } = await import('../../database/connection');
      const supabase = getSupabaseAdmin();

      const { data, error } = await supabase
        .from('stats_channels')
        .insert({
          guild_id: guildId,
          channel_id,
          type,
          format: format || '{count}',
        })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({ data });
    } catch (error) {
      logError(`Failed to create stats channel for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to create stats channel', 'STATS_CHANNEL_CREATE_FAILED');
    }
  }
);

router.delete(
  '/:id/stats-channels/:channelId',
  requireAuth,
  guildGuard,
  rateLimits.configPut,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const channelId = req.params.channelId as string;

    try {
      const { getSupabaseAdmin } = await import('../../database/connection');
      const supabase = getSupabaseAdmin();

      const { data, error } = await supabase
        .from('stats_channels')
        .delete()
        .eq('guild_id', guildId)
        .eq('id', channelId)
        .select('id');

      if (error) throw error;

      if (!data || data.length === 0) {
        sendError(res, 404, 'Stats channel not found', 'STATS_CHANNEL_NOT_FOUND');
        return;
      }

      sendData(res, { deleted: true });
    } catch (error) {
      logError(`Failed to delete stats channel ${channelId} for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to delete stats channel', 'STATS_CHANNEL_DELETE_FAILED');
    }
  }
);

router.post(
  '/:id/stats-channels/update',
  requireAuth,
  guildGuard,
  rateLimits.configPut,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const { id } = req.body;

    if (!id) {
      sendError(res, 400, 'Stats channel ID is required', 'VALIDATION_ERROR');
      return;
    }

    try {
      const { getSupabaseAdmin } = await import('../../database/connection');
      const supabase = getSupabaseAdmin();

      const { data: channel, error: fetchError } = await supabase
        .from('stats_channels')
        .select('*')
        .eq('guild_id', guildId)
        .eq('id', id)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        sendError(res, 404, 'Stats channel not found', 'STATS_CHANNEL_NOT_FOUND');
        return;
      }

      if (fetchError) throw fetchError;

      const { error: updateError } = await supabase
        .from('stats_channels')
        .update({ last_updated: new Date().toISOString() })
        .eq('id', id);

      if (updateError) throw updateError;

      sendData(res, { success: true });
    } catch (error) {
      logError(`Failed to update stats channel ${id} for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to update stats channel', 'STATS_CHANNEL_UPDATE_FAILED');
    }
  }
);

export default router;
