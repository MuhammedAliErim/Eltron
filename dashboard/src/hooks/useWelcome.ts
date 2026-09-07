import { useState, useCallback } from 'react';
import { api, ApiRequestError } from '../api/client';
import { cacheGet, cacheSet, cacheInvalidatePrefix, buildCacheKey } from '../lib/cache';
import type { WelcomeConfig } from '../lib/types';

export function useWelcome(guildId: string | null) {
  const [config, setConfig] = useState<WelcomeConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    if (!guildId) return;
    const cacheKey = buildCacheKey(guildId, 'welcome:config');
    const cached = cacheGet<WelcomeConfig>(cacheKey);
    if (cached) {
      setConfig(cached);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await api.welcome.getConfig(guildId);
      const data = res.data as WelcomeConfig;
      setConfig(data);
      cacheSet(cacheKey, data);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch welcome config');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const updateConfig = useCallback(async (body: Record<string, unknown>) => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.welcome.updateConfig(guildId, body);
      const data = res.data as WelcomeConfig;
      setConfig(data);
      cacheInvalidatePrefix(`${guildId}:welcome`);
      return data;
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to update welcome config');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const refetch = useCallback(() => {
    cacheInvalidatePrefix(`${guildId}:welcome`);
    fetchConfig();
  }, [guildId, fetchConfig]);

  return { config, loading, error, fetchConfig, updateConfig, refetch };
}
