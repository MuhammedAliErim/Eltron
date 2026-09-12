import { useState, useCallback } from 'react';
import { api, ApiRequestError } from '../api/client';
import type { BanAppeal, Pagination } from '../lib/types';

export function useBanAppeals(guildId: string | null) {
  const [appeals, setAppeals] = useState<BanAppeal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const fetchAppeals = useCallback(async (params?: { status?: string; page?: number }) => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.banAppeals.get(guildId, params);
      setAppeals(res.data as BanAppeal[]);
      setPagination(res.pagination);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch ban appeals');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const reviewAppeal = useCallback(async (id: number, data: { status: 'APPROVED' | 'DENIED'; note?: string }) => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.banAppeals.review(guildId, id, data);
      setAppeals((prev) => prev.map((a) => (a.id === id ? (res.data as BanAppeal) : a)));
      return res.data as BanAppeal;
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to review appeal');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const refetch = useCallback(() => {
    fetchAppeals();
  }, [fetchAppeals]);

  return { appeals, loading, error, pagination, fetchAppeals, reviewAppeal, refetch };
}
