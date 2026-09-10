import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { guildGuard } from '../middleware/guildGuard';
import { rateLimits } from '../middleware/rateLimit';
import { parsePagination, sendList, sendData, sendError } from '../utils/response';
import { logError } from '../../utils/logger';

const router = Router();

router.get(
  '/:id/tags',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const pagination = parsePagination(req.query as Record<string, unknown>);

    try {
      const { getSupabaseAdmin } = await import('../../database/connection');
      const supabase = getSupabaseAdmin();

      const [countResult, dataResult] = await Promise.all([
        supabase
          .from('tags')
          .select('*', { count: 'exact', head: true })
          .eq('guild_id', guildId),
        supabase
          .from('tags')
          .select('*')
          .eq('guild_id', guildId)
          .order('name', { ascending: true })
          .range((pagination.page - 1) * pagination.pageSize, pagination.page * pagination.pageSize - 1),
      ]);

      if (countResult.error) throw countResult.error;
      if (dataResult.error) throw dataResult.error;

      sendList(res, dataResult.data || [], countResult.count ?? 0, pagination);
    } catch (error) {
      logError(`Failed to fetch tags for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch tags', 'TAGS_FETCH_FAILED');
    }
  }
);

router.get(
  '/:id/tags/search',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const query = typeof req.query.q === 'string' ? req.query.q : '';

    if (!query.trim()) {
      sendError(res, 400, 'Search query is required', 'QUERY_REQUIRED');
      return;
    }

    try {
      const { getSupabaseAdmin } = await import('../../database/connection');
      const supabase = getSupabaseAdmin();

      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('guild_id', guildId)
        .or(`name.ilike.%${query}%,content.ilike.%${query}%`)
        .order('use_count', { ascending: false })
        .limit(25);

      if (error) throw error;

      sendData(res, data || []);
    } catch (error) {
      logError(`Failed to search tags for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to search tags', 'TAGS_SEARCH_FAILED');
    }
  }
);

router.get(
  '/:id/tags/:name',
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
        .from('tags')
        .select('*')
        .eq('guild_id', guildId)
        .eq('name', name.toLowerCase())
        .single();

      if (error && error.code === 'PGRST116') {
        sendError(res, 404, 'Tag not found', 'TAG_NOT_FOUND');
        return;
      }

      if (error) throw error;

      sendData(res, data);
    } catch (error) {
      logError(`Failed to fetch tag ${name} for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch tag', 'TAG_FETCH_FAILED');
    }
  }
);

router.post(
  '/:id/tags',
  requireAuth,
  guildGuard,
  rateLimits.configPut,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const { name, content, aliases } = req.body;

    if (!name || !content) {
      sendError(res, 400, 'Name and content are required', 'VALIDATION_ERROR');
      return;
    }

    try {
      const { getSupabaseAdmin } = await import('../../database/connection');
      const supabase = getSupabaseAdmin();

      const normalizedName = name.toLowerCase().trim();

      const { data: existing } = await supabase
        .from('tags')
        .select('id')
        .eq('guild_id', guildId)
        .eq('name', normalizedName)
        .single();

      if (existing) {
        sendError(res, 409, 'Tag already exists', 'TAG_EXISTS');
        return;
      }

      const { data, error } = await supabase
        .from('tags')
        .insert({
          guild_id: guildId,
          name: normalizedName,
          content,
          aliases: Array.isArray(aliases) ? aliases : [],
          created_by: req.session?.user?.id || 'unknown',
        })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({ data });
    } catch (error) {
      logError(`Failed to create tag for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to create tag', 'TAG_CREATE_FAILED');
    }
  }
);

router.put(
  '/:id/tags/:name',
  requireAuth,
  guildGuard,
  rateLimits.configPut,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const name = req.params.name as string;
    const { content, aliases } = req.body;

    try {
      const { getSupabaseAdmin } = await import('../../database/connection');
      const supabase = getSupabaseAdmin();

      const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (content !== undefined) updatePayload.content = content;
      if (aliases !== undefined) updatePayload.aliases = aliases;

      const { data, error } = await supabase
        .from('tags')
        .update(updatePayload)
        .eq('guild_id', guildId)
        .eq('name', name.toLowerCase())
        .select()
        .single();

      if (error && error.code === 'PGRST116') {
        sendError(res, 404, 'Tag not found', 'TAG_NOT_FOUND');
        return;
      }

      if (error) throw error;

      sendData(res, data);
    } catch (error) {
      logError(`Failed to update tag ${name} for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to update tag', 'TAG_UPDATE_FAILED');
    }
  }
);

router.delete(
  '/:id/tags/:name',
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
        .from('tags')
        .delete()
        .eq('guild_id', guildId)
        .eq('name', name.toLowerCase())
        .select('id');

      if (error) throw error;

      if (!data || data.length === 0) {
        sendError(res, 404, 'Tag not found', 'TAG_NOT_FOUND');
        return;
      }

      sendData(res, { deleted: true });
    } catch (error) {
      logError(`Failed to delete tag ${name} for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to delete tag', 'TAG_DELETE_FAILED');
    }
  }
);

export default router;
