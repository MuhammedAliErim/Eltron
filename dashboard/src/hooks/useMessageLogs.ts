import { useState, useCallback } from 'react';
import { api, ApiRequestError } from '../api/client';
import type { MessageLog, Pagination } from '../lib/types';

export function useMessageLogs(guildId: string | null) {
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const fetchLogs = useCallback(async (params?: { page?: number; limit?: number; action?: string; author?: string; channel?: string; search?: string }) => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.messageLogs.get(guildId, params);
      setLogs(res.data as MessageLog[]);
      setPagination(res.pagination);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch message logs');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const searchLogs = useCallback(async (query: string) => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.messageLogs.search(guildId, query);
      setLogs(res.data as MessageLog[]);
      setPagination(res.pagination);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to search message logs');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const refetch = useCallback(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { logs, loading, error, pagination, fetchLogs, searchLogs, refetch };
}
