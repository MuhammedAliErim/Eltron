import { useState, useCallback } from 'react';
import { api, ApiRequestError } from '../api/client';
import type { Lockdown } from '../lib/types';

export function useLockdowns(guildId: string | null) {
  const [lockdowns, setLockdowns] = useState<Lockdown[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLockdowns = useCallback(async () => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.lockdowns.get(guildId);
      setLockdowns(res.data as Lockdown[]);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch lockdowns');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const lock = useCallback(async (data: { channel_id: string; reason?: string; duration_minutes?: number }) => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.lockdowns.lock(guildId, data);
      setLockdowns((prev) => [...prev, res.data as Lockdown]);
      return res.data as Lockdown;
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to lock channel');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const unlock = useCallback(async (data: { channel_id?: string; all?: boolean }) => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      await api.lockdowns.unlock(guildId, data);
      if (data.all) {
        setLockdowns([]);
      } else if (data.channel_id) {
        setLockdowns((prev) => prev.filter((l) => l.channel_id !== data.channel_id));
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to unlock channel');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const refetch = useCallback(() => {
    fetchLockdowns();
  }, [fetchLockdowns]);

  return { lockdowns, loading, error, fetchLockdowns, lock, unlock, refetch };
}
