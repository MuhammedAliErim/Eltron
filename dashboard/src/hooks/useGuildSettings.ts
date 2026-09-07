import { useState, useCallback } from 'react';
import { api, ApiRequestError } from '../api/client';
import { cacheGet, cacheSet, cacheInvalidatePrefix, buildCacheKey } from '../lib/cache';
import type { GuildSettings } from '../lib/types';

export function useGuildSettings(guildId: string | null) {
  const [settings, setSettings] = useState<GuildSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!guildId) return;
    const cacheKey = buildCacheKey(guildId, 'settings');
    const cached = cacheGet<GuildSettings>(cacheKey);
    if (cached) {
      setSettings(cached);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await api.settings.get(guildId);
      const data = res.data as GuildSettings;
      setSettings(data);
      cacheSet(cacheKey, data);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch guild settings');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const updateSettings = useCallback(async (body: Record<string, unknown>) => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.settings.update(guildId, body);
      const data = res.data as GuildSettings;
      setSettings(data);
      cacheInvalidatePrefix(`${guildId}:settings`);
      return data;
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to update guild settings');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const refetch = useCallback(() => {
    cacheInvalidatePrefix(`${guildId}:settings`);
    fetchSettings();
  }, [guildId, fetchSettings]);

  return { settings, loading, error, fetchSettings, updateSettings, refetch };
}
