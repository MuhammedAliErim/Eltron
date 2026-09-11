import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { guildGuard } from '../middleware/guildGuard';
import { rateLimits } from '../middleware/rateLimit';
import { parsePagination, sendList, sendData, sendError } from '../utils/response';
import { logError } from '../../utils/logger';

const router = Router({ mergeParams: true });

router.get(
  '/:id/custom-commands',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;

    try {
      const { getSupabaseAdmin } = await import('../../database/connection');
      const supabase = getSupabaseAdmin();

      const { data, error } = await supabase
        .from('custom_commands')
        .select('*')
        .eq('guild_id', guildId)
        .order('name', { ascending: true });

      if (error) throw error;

      sendData(res, data || []);
    } catch (error) {
      logError(`Failed to fetch custom commands for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch custom commands', 'CUSTOM_COMMANDS_FETCH_FAILED');
    }
  }
);

router.get(
  '/:id/custom-commands/:name',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const name = req.params.name as string;

    try {
      const { getSupabaseAdmin } = await import('../../database/connection');
      const supabase = getSupabaseAdmin();

      const { data, error } = await supabase
        .from('custom_commands')
        .select('*')
        .eq('guild_id', guildId)
        .eq('name', name.toLowerCase())
        .single();

      if (error && error.code === 'PGRST116') {
        sendError(res, 404, 'Command not found', 'COMMAND_NOT_FOUND');
        return;
      }

      if (error) throw error;

      sendData(res, data);
    } catch (error) {
      logError(`Failed to fetch custom command ${name} for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch custom command', 'CUSTOM_COMMAND_FETCH_FAILED');
    }
  }
);

router.post(
  '/:id/custom-commands',
  requireAuth,
  guildGuard,
  rateLimits.configPut,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const { name, response, aliases, embed_color } = req.body;

    if (!name || !response) {
      sendError(res, 400, 'Name and response are required', 'VALIDATION_ERROR');
      return;
    }

    try {
      const { getSupabaseAdmin } = await import('../../database/connection');
      const supabase = getSupabaseAdmin();

      const normalizedName = name.toLowerCase().trim();

      const { data: existing } = await supabase
        .from('custom_commands')
        .select('id')
        .eq('guild_id', guildId)
        .eq('name', normalizedName)
        .single();

      if (existing) {
        sendError(res, 409, 'Command already exists', 'COMMAND_EXISTS');
        return;
      }

      const { data, error } = await supabase
        .from('custom_commands')
        .insert({
          guild_id: guildId,
          name: normalizedName,
          response,
          aliases: Array.isArray(aliases) ? aliases : [],
          embed_color: embed_color || null,
          created_by: req.session?.user?.id || 'unknown',
        })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({ data });
    } catch (error) {
      logError(`Failed to create custom command for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to create custom command', 'CUSTOM_COMMAND_CREATE_FAILED');
    }
  }
);

router.put(
  '/:id/custom-commands/:name',
  requireAuth,
  guildGuard,
  rateLimits.configPut,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const name = req.params.name as string;
    const { response, aliases, embed_color, enabled } = req.body;

    try {
      const { getSupabaseAdmin } = await import('../../database/connection');
      const supabase = getSupabaseAdmin();

      const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (response !== undefined) updatePayload.response = response;
      if (aliases !== undefined) updatePayload.aliases = aliases;
      if (embed_color !== undefined) updatePayload.embed_color = embed_color || null;
      if (enabled !== undefined) updatePayload.enabled = enabled;

      const { data, error } = await supabase
        .from('custom_commands')
        .update(updatePayload)
        .eq('guild_id', guildId)
        .eq('name', name.toLowerCase())
        .select()
        .single();

      if (error && error.code === 'PGRST116') {
        sendError(res, 404, 'Command not found', 'COMMAND_NOT_FOUND');
        return;
      }

      if (error) throw error;

      sendData(res, data);
    } catch (error) {
      logError(`Failed to update custom command ${name} for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to update custom command', 'CUSTOM_COMMAND_UPDATE_FAILED');
    }
  }
);

router.delete(
  '/:id/custom-commands/:name',
  requireAuth,
  guildGuard,
  rateLimits.configPut,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const name = req.params.name as string;

    try {
      const { getSupabaseAdmin } = await import('../../database/connection');
      const supabase = getSupabaseAdmin();

      const { data, error } = await supabase
        .from('custom_commands')
        .delete()
        .eq('guild_id', guildId)
        .eq('name', name.toLowerCase())
        .select('id');

      if (error) throw error;

      if (!data || data.length === 0) {
        sendError(res, 404, 'Command not found', 'COMMAND_NOT_FOUND');
        return;
      }

      sendData(res, { deleted: true });
    } catch (error) {
      logError(`Failed to delete custom command ${name} for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to delete custom command', 'CUSTOM_COMMAND_DELETE_FAILED');
    }
  }
);

export default router;
