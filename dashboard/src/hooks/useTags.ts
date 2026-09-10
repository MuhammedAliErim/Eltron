import { useState, useCallback } from 'react';
import { api, ApiRequestError } from '../api/client';
import type { Tag } from '../lib/types';

export function useTags(guildId: string | null) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTags = useCallback(async (params?: { search?: string }) => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.tags.list(guildId, params);
      setTags(res.data as Tag[]);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch tags');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const createTag = useCallback(async (body: Record<string, unknown>) => {
    if (!guildId) return;
    await api.tags.create(guildId, body);
    await fetchTags();
  }, [guildId, fetchTags]);

  const updateTag = useCallback(async (id: number, body: Record<string, unknown>) => {
    if (!guildId) return;
    await api.tags.update(guildId, id, body);
    await fetchTags();
  }, [guildId, fetchTags]);

  const deleteTag = useCallback(async (id: number) => {
    if (!guildId) return;
    await api.tags.delete(guildId, id);
    await fetchTags();
  }, [guildId, fetchTags]);

  const refetch = useCallback(() => {
    fetchTags();
  }, [fetchTags]);

  return { tags, loading, error, fetchTags, createTag, updateTag, deleteTag, refetch };
}
