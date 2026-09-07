import { useState, useCallback } from 'react';
import { api, ApiRequestError } from '../api/client';
import { cacheGet, cacheSet, cacheInvalidatePrefix, buildCacheKey } from '../lib/cache';
import type { Giveaway, GiveawayEntry, GiveawayWinner, Pagination } from '../lib/types';

export function useGiveaways(guildId: string | null) {
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [currentGiveaway, setCurrentGiveaway] = useState<(Giveaway & { entries: GiveawayEntry[]; winners: GiveawayWinner[] }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const fetchGiveaways = useCallback(async (params?: { page?: number; pageSize?: number; status?: string }) => {
    if (!guildId) return;
    const cacheKey = buildCacheKey(guildId, 'giveaways', JSON.stringify(params));
    const cached = cacheGet<{ giveaways: Giveaway[]; pagination: Pagination }>(cacheKey);
    if (cached) {
      setGiveaways(cached.giveaways);
      setPagination(cached.pagination);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await api.giveaways.list(guildId, params);
      const data = res.data as Giveaway[];
      setGiveaways(data);
      setPagination(res.pagination);
      cacheSet(cacheKey, { giveaways: data, pagination: res.pagination });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch giveaways');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const getGiveaway = useCallback(async (giveawayId: number) => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.giveaways.get(guildId, giveawayId);
      setCurrentGiveaway(res.data as Giveaway & { entries: GiveawayEntry[]; winners: GiveawayWinner[] });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch giveaway');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const refetch = useCallback(() => {
    cacheInvalidatePrefix(`${guildId}:giveaways`);
    fetchGiveaways();
  }, [guildId, fetchGiveaways]);

  return { giveaways, currentGiveaway, loading, error, pagination, fetchGiveaways, getGiveaway, refetch };
}
