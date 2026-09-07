import { useState, useCallback } from 'react';
import { api, ApiRequestError } from '../api/client';
import { cacheGet, cacheSet, cacheInvalidatePrefix, buildCacheKey } from '../lib/cache';
import type { AutoModConfig, AutoModRule } from '../lib/types';

export function useAutoMod(guildId: string | null) {
  const [config, setConfig] = useState<AutoModConfig | null>(null);
  const [rules, setRules] = useState<AutoModRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    if (!guildId) return;
    const cacheKey = buildCacheKey(guildId, 'automod:config');
    const cached = cacheGet<AutoModConfig>(cacheKey);
    if (cached) {
      setConfig(cached);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await api.automod.getConfig(guildId);
      const data = res.data as AutoModConfig;
      setConfig(data);
      cacheSet(cacheKey, data);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch automod config');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const updateConfig = useCallback(async (body: Record<string, unknown>) => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.automod.updateConfig(guildId, body);
      const data = res.data as AutoModConfig;
      setConfig(data);
      cacheInvalidatePrefix(`${guildId}:automod`);
      return data;
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to update automod config');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const fetchRules = useCallback(async () => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.automod.getRules(guildId);
      setRules(res.data as AutoModRule[]);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch automod rules');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const refetch = useCallback(() => {
    cacheInvalidatePrefix(`${guildId}:automod`);
    fetchConfig();
    fetchRules();
  }, [guildId, fetchConfig, fetchRules]);

  return { config, rules, loading, error, fetchConfig, updateConfig, fetchRules, refetch };
}
