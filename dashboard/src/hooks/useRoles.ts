import { useState, useCallback } from 'react';
import { api, ApiRequestError } from '../api/client';
import { cacheGet, cacheSet, cacheInvalidatePrefix, buildCacheKey } from '../lib/cache';
import type { AutoRoleConfig } from '../lib/types';

export function useRoles(guildId: string | null) {
  const [config, setConfig] = useState<AutoRoleConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    if (!guildId) return;
    const cacheKey = buildCacheKey(guildId, 'roles:autorole');
    const cached = cacheGet<AutoRoleConfig>(cacheKey);
    if (cached) {
      setConfig(cached);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await api.roles.getAutoRole(guildId);
      const data = res.data as AutoRoleConfig;
      setConfig(data);
      cacheSet(cacheKey, data);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch auto-role config');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const updateConfig = useCallback(async (body: Record<string, unknown>) => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.roles.updateAutoRole(guildId, body);
      const data = res.data as AutoRoleConfig;
      setConfig(data);
      cacheInvalidatePrefix(`${guildId}:roles`);
      return data;
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to update auto-role config');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const refetch = useCallback(() => {
    cacheInvalidatePrefix(`${guildId}:roles`);
    fetchConfig();
  }, [guildId, fetchConfig]);

  return { config, loading, error, fetchConfig, updateConfig, refetch };
}
