import { useState, useCallback } from 'react';
import { api, ApiRequestError } from '../api/client';
import type { StarboardConfig, StarboardEntry } from '../lib/types';

export function useStarboard(guildId: string | null) {
  const [config, setConfig] = useState<StarboardConfig | null>(null);
  const [topEntries, setTopEntries] = useState<StarboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.starboard.getConfig(guildId);
      setConfig(res.data as StarboardConfig);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch starboard config');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const updateConfig = useCallback(async (body: Record<string, unknown>) => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.starboard.updateConfig(guildId, body);
      setConfig(res.data as StarboardConfig);
      return res.data as StarboardConfig;
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to update starboard config');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const fetchTop = useCallback(async () => {
    if (!guildId) return;
    try {
      const res = await api.starboard.getTop(guildId);
      setTopEntries(res.data as StarboardEntry[]);
    } catch {
    }
  }, [guildId]);

  const refetch = useCallback(() => {
    fetchConfig();
    fetchTop();
  }, [fetchConfig, fetchTop]);

  return { config, topEntries, loading, error, fetchConfig, updateConfig, fetchTop, refetch };
}
