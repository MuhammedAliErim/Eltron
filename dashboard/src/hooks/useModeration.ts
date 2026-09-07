import { useState, useCallback } from 'react';
import { api, ApiRequestError } from '../api/client';
import { cacheGet, cacheSet, cacheInvalidatePrefix, buildCacheKey } from '../lib/cache';
import type { ModerationCase, Pagination } from '../lib/types';

export function useModeration(guildId: string | null) {
  const [cases, setCases] = useState<ModerationCase[]>([]);
  const [currentCase, setCurrentCase] = useState<ModerationCase | null>(null);
  const [warnings, setWarnings] = useState<ModerationCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const fetchCases = useCallback(async (params?: { page?: number; pageSize?: number; type?: string; userId?: string }) => {
    if (!guildId) return;
    const cacheKey = buildCacheKey(guildId, 'moderation', JSON.stringify(params));
    const cached = cacheGet<{ cases: ModerationCase[]; pagination: Pagination }>(cacheKey);
    if (cached) {
      setCases(cached.cases);
      setPagination(cached.pagination);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await api.moderation.logs(guildId, params);
      const data = res.data as ModerationCase[];
      setCases(data);
      setPagination(res.pagination);
      cacheSet(cacheKey, { cases: data, pagination: res.pagination });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch moderation logs');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const getCase = useCallback(async (caseId: number) => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.moderation.getCase(guildId, caseId);
      setCurrentCase(res.data as ModerationCase);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch case');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const getWarnings = useCallback(async (userId: string) => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.moderation.getWarnings(guildId, userId);
      setWarnings(res.data as ModerationCase[]);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch warnings');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const refetch = useCallback(() => {
    cacheInvalidatePrefix(`${guildId}:moderation`);
    fetchCases();
  }, [guildId, fetchCases]);

  return { cases, currentCase, warnings, loading, error, pagination, fetchCases, getCase, getWarnings, refetch };
}
