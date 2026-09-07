import { useState, useCallback } from 'react';
import { api, ApiRequestError } from '../api/client';
import type { LeaderboardEntry, UserXP, Pagination } from '../lib/types';

export function useLeveling(guildId: string | null) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userXP, setUserXP] = useState<UserXP | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const fetchLeaderboard = useCallback(async (params?: { page?: number; pageSize?: number }) => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.leveling.leaderboard(guildId, params);
      setLeaderboard(res.data as LeaderboardEntry[]);
      setPagination(res.pagination);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch leaderboard');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const getUser = useCallback(async (userId: string) => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.leveling.getUser(guildId, userId);
      setUserXP(res.data as UserXP);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch user XP');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const refetch = useCallback(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return { leaderboard, userXP, loading, error, pagination, fetchLeaderboard, getUser, refetch };
}
