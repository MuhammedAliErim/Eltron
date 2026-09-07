import { useState, useCallback } from 'react';
import { api, ApiRequestError } from '../api/client';
import { cacheGet, cacheSet, cacheInvalidatePrefix, buildCacheKey } from '../lib/cache';
import type { Poll, PollOption, PollResult, Pagination } from '../lib/types';

export function usePolls(guildId: string | null) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [currentPoll, setCurrentPoll] = useState<(Poll & { options: PollOption[]; results: PollResult[] }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const fetchPolls = useCallback(async (params?: { page?: number; pageSize?: number; status?: string }) => {
    if (!guildId) return;
    const cacheKey = buildCacheKey(guildId, 'polls', JSON.stringify(params));
    const cached = cacheGet<{ polls: Poll[]; pagination: Pagination }>(cacheKey);
    if (cached) {
      setPolls(cached.polls);
      setPagination(cached.pagination);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await api.polls.list(guildId, params);
      const data = res.data as Poll[];
      setPolls(data);
      setPagination(res.pagination);
      cacheSet(cacheKey, { polls: data, pagination: res.pagination });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch polls');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const getPoll = useCallback(async (pollId: number) => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.polls.get(guildId, pollId);
      setCurrentPoll(res.data as Poll & { options: PollOption[]; results: PollResult[] });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch poll');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const refetch = useCallback(() => {
    cacheInvalidatePrefix(`${guildId}:polls`);
    fetchPolls();
  }, [guildId, fetchPolls]);

  return { polls, currentPoll, loading, error, pagination, fetchPolls, getPoll, refetch };
}
