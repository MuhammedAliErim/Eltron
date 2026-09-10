import { useState, useCallback } from 'react';
import { api, ApiRequestError } from '../api/client';
import type { AuditLog, AuditLogStats, Pagination } from '../lib/types';

export function useAuditLogs(guildId: string | null) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const fetchLogs = useCallback(async (params?: { page?: number; limit?: number; action?: string; moderator?: string; from?: string; to?: string }) => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.auditLogs.list(guildId, params);
      setLogs(res.data as AuditLog[]);
      setPagination(res.pagination);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const fetchStats = useCallback(async () => {
    if (!guildId) return;
    try {
      const res = await api.auditLogs.stats(guildId);
      setStats(res.data as AuditLogStats);
    } catch {
    }
  }, [guildId]);

  const refetch = useCallback(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { logs, stats, loading, error, pagination, fetchLogs, fetchStats, refetch };
}
