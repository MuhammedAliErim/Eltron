import { useState, useCallback } from 'react';
import { api, ApiRequestError } from '../api/client';
import type { StaffMember } from '../lib/types';

export function useStaff(guildId: string | null) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStaff = useCallback(async (params?: { status?: string }) => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.staff.list(guildId, params);
      setStaff(res.data as StaffMember[]);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch staff');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const refetch = useCallback(() => {
    fetchStaff();
  }, [fetchStaff]);

  return { staff, loading, error, fetchStaff, refetch };
}
