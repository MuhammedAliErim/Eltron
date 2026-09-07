import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { AnalyticsSummary } from '../lib/types';

export function useAnalytics(guildId: string | null) {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const resp = await api.analytics.overview(guildId);
      setAnalytics(resp.data.weekly as unknown as AnalyticsSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const fetchDaily = useCallback(async (date: string) => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const resp = await api.analytics.daily(guildId, date);
      setAnalytics(resp.data as unknown as AnalyticsSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const fetchWeekly = useCallback(async () => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const resp = await api.analytics.weekly(guildId);
      setAnalytics(resp.data as unknown as AnalyticsSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const fetchMonthly = useCallback(async () => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const resp = await api.analytics.monthly(guildId);
      setAnalytics(resp.data as unknown as AnalyticsSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const fetchRange = useCallback(async (from: string, to: string) => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const resp = await api.analytics.range(guildId, from, to);
      setAnalytics(resp.data as unknown as AnalyticsSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  return {
    analytics,
    loading,
    error,
    fetchOverview,
    fetchDaily,
    fetchWeekly,
    fetchMonthly,
    fetchRange,
  };
}
