import { useState, useCallback } from 'react';
import { api, ApiRequestError } from '../api/client';
import type { AutoResponse } from '../lib/types';

export function useAutoResponses(guildId: string | null) {
  const [responses, setResponses] = useState<AutoResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResponses = useCallback(async () => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.autoResponses.list(guildId);
      setResponses(res.data as AutoResponse[]);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch auto-responses');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const createResponse = useCallback(async (body: Record<string, unknown>) => {
    if (!guildId) return;
    await api.autoResponses.create(guildId, body);
    await fetchResponses();
  }, [guildId, fetchResponses]);

  const updateResponse = useCallback(async (id: number, body: Record<string, unknown>) => {
    if (!guildId) return;
    await api.autoResponses.update(guildId, id, body);
    await fetchResponses();
  }, [guildId, fetchResponses]);

  const deleteResponse = useCallback(async (id: number) => {
    if (!guildId) return;
    await api.autoResponses.delete(guildId, id);
    await fetchResponses();
  }, [guildId, fetchResponses]);

  const refetch = useCallback(() => {
    fetchResponses();
  }, [fetchResponses]);

  return { responses, loading, error, fetchResponses, createResponse, updateResponse, deleteResponse, refetch };
}
