import { useState, useEffect, useCallback } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { PageHeader } from '../components/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { DataTable, type Column } from '../components/DataTable';
import { FilterBar, FilterSelect } from '../components/FilterBar';
import { SearchInput } from '../components/ui/SearchInput';
import { Pagination } from '../components/Pagination';
import { StatCard } from '../components/dashboard/StatCard';
import { EmptyState, ErrorDisplay, LoadingDisplay } from '../components/ui/EmptyState';
import { formatRelativeTime } from '../lib/utils';
import { AUDIT_LOG_ACTIONS } from '../lib/constants';
import type { AuditLog } from '../lib/types';

export function AuditLogsPage() {
  const { activeGuild } = useGuild();
  const guildId = activeGuild?.id ?? null;
  const { logs, stats, loading, error, pagination, fetchLogs, fetchStats, refetch } = useAuditLogs(guildId);

  const [actionFilter, setActionFilter] = useState('');
  const [moderatorFilter, setModeratorFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchData = useCallback(() => {
    fetchLogs({
      page,
      limit: 20,
      action: actionFilter || undefined,
      moderator: moderatorFilter || undefined,
    });
  }, [fetchLogs, page, actionFilter, moderatorFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (guildId) fetchStats(); }, [guildId, fetchStats]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (guildId) {
        fetchData();
        fetchStats();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [guildId, fetchData, fetchStats]);

  const ACTION_VARIANTS: Record<string, 'warning' | 'success' | 'danger' | 'info' | 'default'> = {
    WARN: 'warning',
    TIMEOUT: 'warning',
    KICK: 'danger',
    BAN: 'danger',
    UNBAN: 'success',
    MUTE: 'info',
    AUTOMOD: 'info',
  };

  const columns: Column<AuditLog>[] = [
    {
      key: 'created_at',
      label: 'Time',
      render: (log) => (
        <span className="text-eltron-subtle text-xs whitespace-nowrap">{formatRelativeTime(log.created_at)}</span>
      ),
    },
    {
      key: 'action',
      label: 'Action',
      render: (log) => (
        <Badge variant={ACTION_VARIANTS[log.action] || 'default'} size="sm">{log.action}</Badge>
      ),
    },
    {
      key: 'moderator_id',
      label: 'Moderator',
      render: (log) => <span className="font-mono text-xs">{log.moderator_id}</span>,
    },
    {
      key: 'target_id',
      label: 'Target',
      hideOnMobile: true,
      render: (log) => (
        <span className="font-mono text-xs text-eltron-subtle">{log.target_id || '-'}</span>
      ),
    },
    {
      key: 'reason',
      label: 'Reason',
      hideOnMobile: true,
      render: (log) => (
        <span className="truncate max-w-[200px] text-eltron-muted">{log.reason || '-'}</span>
      ),
    },
  ];

  if (!guildId) {
    return <EmptyState title="No server selected" description="Select a server from the sidebar." icon="Activity" />;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Audit Logs" description="Track all moderation actions" icon="Activity" />

      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard title="Total Actions" value={stats?.total ?? 0} icon="Activity" />
          <StatCard title="Warnings" value={stats?.by_action?.WARN ?? 0} icon="AlertTriangle" color="text-eltron-warning" />
          <StatCard title="Bans" value={stats?.by_action?.BAN ?? 0} icon="Shield" color="text-eltron-danger" />
          <StatCard title="Kicks" value={stats?.by_action?.KICK ?? 0} icon="Members" color="text-eltron-info" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Log History</CardTitle>
          </CardHeader>
          <CardContent>
            <FilterBar>
              <FilterSelect label="Action" options={AUDIT_LOG_ACTIONS} value={actionFilter} onChange={(v) => { setActionFilter(v); setPage(1); }} />
              <SearchInput
                value={moderatorFilter}
                onChange={(v) => { setModeratorFilter(v); setPage(1); }}
                placeholder="Filter by moderator ID..."
                className="w-60"
              />
            </FilterBar>

            {loading && <LoadingDisplay />}
            {!loading && error && <ErrorDisplay message={error} onRetry={refetch} />}
            {!loading && !error && (
              <>
                <DataTable
                  columns={columns}
                  data={logs}
                  keyExtractor={(log) => log.id}
                  emptyIcon="Activity"
                  emptyTitle="No audit logs"
                  emptyDescription="No audit logs found for the selected filters."
                />
                {pagination && <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
