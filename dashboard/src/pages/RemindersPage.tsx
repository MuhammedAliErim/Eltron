import { useState, useEffect, useCallback } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { useReminders } from '../hooks/useReminders';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { Badge } from '../components/ui/Badge';
import { FilterBar, FilterSelect } from '../components/FilterBar';
import { Pagination } from '../components/Pagination';
import { EmptyState, ErrorDisplay, LoadingDisplay } from '../components/ui/EmptyState';
import { formatRelativeTime } from '../lib/utils';
import { REMINDER_STATUSES } from '../lib/constants';
import type { Reminder } from '../lib/types';

const STATUS_VARIANTS: Record<string, 'warning' | 'success' | 'default'> = {
  PENDING: 'warning',
  TRIGGERED: 'success',
  CANCELLED: 'default',
};

export function RemindersPage() {
  const { activeGuild } = useGuild();
  const guildId = activeGuild?.id ?? null;
  const { reminders, loading, error, pagination, fetchReminders, refetch } = useReminders(guildId);

  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchData = useCallback(() => {
    fetchReminders({ page, pageSize: 20, status: statusFilter || undefined });
  }, [fetchReminders, page, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns: Column<Reminder>[] = [
    { key: 'message', label: 'Message', render: (r) => <span className="truncate max-w-[250px]">{r.message}</span> },
    { key: 'user_id', label: 'User', render: (r) => <span className="font-mono text-xs">{r.user_id}</span> },
    { key: 'channel_id', label: 'Channel', hideOnMobile: true, render: (r) => <span className="font-mono text-xs text-eltron-subtle">{r.channel_id}</span> },
    { key: 'remind_at', label: 'Remind At', render: (r) => (
      <span className="text-eltron-subtle text-xs whitespace-nowrap">{formatRelativeTime(r.remind_at)}</span>
    )},
    { key: 'status', label: 'Status', render: (r) => (
      <Badge variant={STATUS_VARIANTS[r.status] || 'default'} size="sm">{r.status}</Badge>
    )},
  ];

  if (!guildId) return <EmptyState title="No server selected" description="Select a server from the sidebar." icon="Bell" />;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Reminders" description="View scheduled reminders" icon="Bell" />

      <FilterBar>
        <FilterSelect label="Status" options={REMINDER_STATUSES} value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }} />
      </FilterBar>

      {loading && <LoadingDisplay />}
      {!loading && error && <ErrorDisplay message={error} onRetry={refetch} />}
      {!loading && !error && (
        <>
          <div className="card">
            <DataTable columns={columns} data={reminders} keyExtractor={(r) => r.id} emptyIcon="Bell" emptyTitle="No reminders" emptyDescription="No reminders found." />
          </div>
          {pagination && <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}
