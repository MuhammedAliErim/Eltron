import { useState, useCallback } from 'react';
import { api, ApiRequestError } from '../api/client';
import type { StatsChannel } from '../lib/types';

export function useStatsChannels(guildId: string | null) {
  const [channels, setChannels] = useState<StatsChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChannels = useCallback(async () => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.statsChannels.list(guildId);
      setChannels(res.data as StatsChannel[]);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch stats channels');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const createChannel = useCallback(async (body: Record<string, unknown>) => {
    if (!guildId) return;
    await api.statsChannels.create(guildId, body);
    await fetchChannels();
  }, [guildId, fetchChannels]);

  const deleteChannel = useCallback(async (id: string) => {
    if (!guildId) return;
    await api.statsChannels.delete(guildId, id);
    await fetchChannels();
  }, [guildId, fetchChannels]);

  const forceUpdate = useCallback(async (id: string) => {
    if (!guildId) return;
    await api.statsChannels.forceUpdate(guildId, id);
  }, [guildId]);

  const refetch = useCallback(() => {
    fetchChannels();
  }, [fetchChannels]);

  return { channels, loading, error, fetchChannels, createChannel, deleteChannel, forceUpdate, refetch };
}
