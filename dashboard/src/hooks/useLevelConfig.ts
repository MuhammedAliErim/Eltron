import { useState, useCallback } from 'react';
import { api, ApiRequestError } from '../api/client';
import { cacheGet, cacheSet, cacheInvalidatePrefix, buildCacheKey } from '../lib/cache';
import type { LevelingConfig, LevelRoleReward } from '../lib/types';

export function useLevelConfig(guildId: string | null) {
  const [config, setConfig] = useState<LevelingConfig | null>(null);
  const [rewards, setRewards] = useState<LevelRoleReward[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    if (!guildId) return;
    const cacheKey = buildCacheKey(guildId, 'leveling:config');
    const cached = cacheGet<LevelingConfig>(cacheKey);
    if (cached) {
      setConfig(cached);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await api.leveling.getConfig(guildId);
      const data = res.data as LevelingConfig;
      setConfig(data);
      cacheSet(cacheKey, data);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch leveling config');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const updateConfig = useCallback(async (body: Record<string, unknown>) => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.leveling.updateConfig(guildId, body);
      const data = res.data as LevelingConfig;
      setConfig(data);
      cacheInvalidatePrefix(`${guildId}:leveling`);
      return data;
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to update leveling config');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const fetchRewards = useCallback(async () => {
    if (!guildId) return;
    try {
      const res = await api.leveling.getRewards(guildId);
      setRewards(res.data as LevelRoleReward[]);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch role rewards');
    }
  }, [guildId]);

  const addReward = useCallback(async (level: number, roleId: string) => {
    if (!guildId) return;
    try {
      const res = await api.leveling.addReward(guildId, { level, role_id: roleId });
      const reward = res.data as LevelRoleReward;
      setRewards((prev) => [...prev.filter((r) => r.level !== level), reward].sort((a, b) => a.level - b.level));
      return reward;
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to add role reward');
      throw err;
    }
  }, [guildId]);

  const removeReward = useCallback(async (level: number) => {
    if (!guildId) return;
    try {
      await api.leveling.removeReward(guildId, level);
      setRewards((prev) => prev.filter((r) => r.level !== level));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to remove role reward');
      throw err;
    }
  }, [guildId]);

  const refetch = useCallback(() => {
    cacheInvalidatePrefix(`${guildId}:leveling`);
    fetchConfig();
    fetchRewards();
  }, [guildId, fetchConfig, fetchRewards]);

  return { config, rewards, loading, error, fetchConfig, updateConfig, fetchRewards, addReward, removeReward, refetch };
}
