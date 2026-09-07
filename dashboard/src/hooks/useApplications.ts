import { useState, useCallback } from 'react';
import { api, ApiRequestError } from '../api/client';
import { cacheGet, cacheSet, cacheInvalidatePrefix, buildCacheKey } from '../lib/cache';
import type { Application, ApplicationAnswer, Pagination } from '../lib/types';

export function useApplications(guildId: string | null) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [currentApplication, setCurrentApplication] = useState<(Application & { answers: ApplicationAnswer[] }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const fetchApplications = useCallback(async (params?: { page?: number; pageSize?: number; status?: string; type?: string }) => {
    if (!guildId) return;
    const cacheKey = buildCacheKey(guildId, 'applications', JSON.stringify(params));
    const cached = cacheGet<{ applications: Application[]; pagination: Pagination }>(cacheKey);
    if (cached) {
      setApplications(cached.applications);
      setPagination(cached.pagination);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await api.applications.list(guildId, params);
      const data = res.data as Application[];
      setApplications(data);
      setPagination(res.pagination);
      cacheSet(cacheKey, { applications: data, pagination: res.pagination });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const getApplication = useCallback(async (appId: number) => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.applications.get(guildId, appId);
      setCurrentApplication(res.data as Application & { answers: ApplicationAnswer[] });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch application');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const refetch = useCallback(() => {
    cacheInvalidatePrefix(`${guildId}:applications`);
    fetchApplications();
  }, [guildId, fetchApplications]);

  return { applications, currentApplication, loading, error, pagination, fetchApplications, getApplication, refetch };
}
