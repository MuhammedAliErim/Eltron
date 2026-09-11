import { useState, useCallback } from 'react';
import { api, ApiRequestError } from '../api/client';
import type { CountingConfig, CountingScore } from '../lib/types';

export function useCounting(guildId: string | null) {
  const [config, setConfig] = useState<CountingConfig | null>(null);
  const [scores, setScores] = useState<CountingScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.counting.getConfig(guildId);
      setConfig(res.data as CountingConfig);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch counting config');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const updateConfig = useCallback(async (body: Record<string, unknown>) => {
    if (!guildId) return;
    await api.counting.updateConfig(guildId, body);
    await fetchConfig();
  }, [guildId, fetchConfig]);

  const fetchScores = useCallback(async () => {
    if (!guildId) return;
    try {
      const res = await api.counting.getScores(guildId);
      setScores(res.data as CountingScore[]);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch scores');
    }
  }, [guildId]);

  const refetch = useCallback(() => {
    fetchConfig();
    fetchScores();
  }, [fetchConfig, fetchScores]);

  return { config, scores, loading, error, fetchConfig, updateConfig, fetchScores, refetch };
}
