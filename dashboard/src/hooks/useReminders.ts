import { useState, useCallback } from 'react';
import { api, ApiRequestError } from '../api/client';
import type { Reminder, Pagination } from '../lib/types';

export function useReminders(guildId: string | null) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const fetchReminders = useCallback(async (params?: { page?: number; pageSize?: number; status?: string }) => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.reminders.list(guildId, params);
      setReminders(res.data as Reminder[]);
      setPagination(res.pagination);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch reminders');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const refetch = useCallback(() => {
    fetchReminders();
  }, [fetchReminders]);

  return { reminders, loading, error, pagination, fetchReminders, refetch };
}
