import { useState, useEffect, useCallback } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { useModeration } from '../hooks/useModeration';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/dashboard/StatCard';
import { DataTable, type Column } from '../components/DataTable';
import { Badge } from '../components/ui/Badge';
import { SearchInput } from '../components/ui/SearchInput';
import { FilterBar, FilterSelect } from '../components/FilterBar';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/Pagination';
import { EmptyState, ErrorDisplay, LoadingDisplay } from '../components/ui/EmptyState';
import { Avatar } from '../components/ui/Avatar';
import { formatRelativeTime } from '../lib/utils';
import { MODERATION_TYPES } from '../lib/constants';
import type { ModerationCase } from '../lib/types';

const ACTION_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  WARN: 'warning',
  TIMEOUT: 'info',
  KICK: 'danger',
  BAN: 'danger',
  UNBAN: 'success',
  MUTE: 'default',
};

export function ModerationPage() {
  const { activeGuild } = useGuild();
  const guildId = activeGuild?.id ?? null;
  const { cases, loading, error, pagination, fetchCases, refetch } = useModeration(guildId);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedCase, setSelectedCase] = useState<ModerationCase | null>(null);

  const fetchData = useCallback(() => {
    fetchCases({ page, pageSize: 20, type: typeFilter || undefined });
  }, [fetchCases, page, typeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredCases = cases.filter((c) =>
    !search || c.user_id.includes(search) || c.moderator_id.includes(search) || c.reason.toLowerCase().includes(search.toLowerCase())
  );

  const totalWarnings = cases.filter((c) => c.type === 'WARN').length;
  const totalTimeouts = cases.filter((c) => c.type === 'TIMEOUT').length;
  const totalBans = cases.filter((c) => c.type === 'BAN').length;

  const columns: Column<ModerationCase>[] = [
    { key: 'case_id', label: '#', render: (c) => <span className="font-mono text-eltron-subtle">#{c.case_id}</span> },
    { key: 'user_id', label: 'User', render: (c) => (
      <div className="flex items-center gap-2">
        <Avatar userId={c.user_id} alt={c.user_id} size="xs" />
        <span className="truncate max-w-[120px]">{c.user_id}</span>
      </div>
    )},
    { key: 'moderator_id', label: 'Moderator', hideOnMobile: true, render: (c) => (
      <span className="truncate max-w-[120px] text-eltron-subtle">{c.moderator_id}</span>
    )},
    { key: 'type', label: 'Action', render: (c) => (
      <Badge variant={ACTION_VARIANTS[c.type] || 'default'} size="sm">{c.type}</Badge>
    )},
    { key: 'reason', label: 'Reason', hideOnMobile: true, render: (c) => (
      <span className="truncate max-w-[200px] text-eltron-muted">{c.reason || '-'}</span>
    )},
    { key: 'created_at', label: 'Date', render: (c) => (
      <span className="text-eltron-subtle text-xs whitespace-nowrap">{formatRelativeTime(c.created_at)}</span>
    )},
    { key: 'active', label: 'Status', render: (c) => (
      <Badge variant={c.active ? 'success' : 'default'} size="sm">{c.active ? 'Active' : 'Revoked'}</Badge>
    )},
  ];

  if (!guildId) {
    return <EmptyState title="No server selected" description="Select a server from the sidebar." icon="Shield" />;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Moderation" description="View moderation history and manage cases" icon="Moderation" actions={
        <button onClick={refetch} className="btn-secondary text-sm">
          Refresh
        </button>
      } />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard title="Total Cases" value={pagination?.total || cases.length} icon="Moderation" />
        <StatCard title="Warnings" value={totalWarnings} icon="AlertTriangle" color="text-eltron-warning" />
        <StatCard title="Timeouts" value={totalTimeouts} icon="Clock" color="text-eltron-info" />
        <StatCard title="Bans" value={totalBans} icon="Shield" color="text-eltron-danger" />
      </div>

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by user, moderator, or reason..." />
        <FilterSelect label="Action" options={MODERATION_TYPES} value={typeFilter} onChange={(v) => { setTypeFilter(v); setPage(1); }} />
      </FilterBar>

      {loading && <LoadingDisplay />}
      {!loading && error && <ErrorDisplay message={error} onRetry={refetch} />}
      {!loading && !error && (
        <>
          <div className="card">
            <DataTable
              columns={columns}
              data={filteredCases}
              keyExtractor={(c) => c.id}
              onRowClick={setSelectedCase}
              emptyIcon="Moderation"
              emptyTitle="No moderation cases"
              emptyDescription="No moderation actions have been recorded yet."
            />
          </div>
          {pagination && (
            <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
          )}
        </>
      )}

      <Modal isOpen={!!selectedCase} onClose={() => setSelectedCase(null)} title={`Case #${selectedCase?.case_id}`} size="lg">
        {selectedCase && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xs text-eltron-subtle uppercase tracking-wider mb-1">User</p>
                <div className="flex items-center gap-2">
                  <Avatar userId={selectedCase.user_id} alt={selectedCase.user_id} size="sm" />
                  <span className="text-sm text-eltron-text">{selectedCase.user_id}</span>
                </div>
              </div>
              <div>
                <p className="text-2xs text-eltron-subtle uppercase tracking-wider mb-1">Moderator</p>
                <span className="text-sm text-eltron-text">{selectedCase.moderator_id}</span>
              </div>
              <div>
                <p className="text-2xs text-eltron-subtle uppercase tracking-wider mb-1">Action</p>
                <Badge variant={ACTION_VARIANTS[selectedCase.type] || 'default'}>{selectedCase.type}</Badge>
              </div>
              <div>
                <p className="text-2xs text-eltron-subtle uppercase tracking-wider mb-1">Status</p>
                <Badge variant={selectedCase.active ? 'success' : 'default'}>{selectedCase.active ? 'Active' : 'Revoked'}</Badge>
              </div>
              <div className="col-span-2">
                <p className="text-2xs text-eltron-subtle uppercase tracking-wider mb-1">Reason</p>
                <p className="text-sm text-eltron-text">{selectedCase.reason || 'No reason provided'}</p>
              </div>
              {selectedCase.duration && (
                <div>
                  <p className="text-2xs text-eltron-subtle uppercase tracking-wider mb-1">Duration</p>
                  <p className="text-sm text-eltron-text">{selectedCase.duration}s</p>
                </div>
              )}
              <div>
                <p className="text-2xs text-eltron-subtle uppercase tracking-wider mb-1">Created</p>
                <p className="text-sm text-eltron-text">{formatRelativeTime(selectedCase.created_at)}</p>
              </div>
              {selectedCase.expires_at && (
                <div>
                  <p className="text-2xs text-eltron-subtle uppercase tracking-wider mb-1">Expires</p>
                  <p className="text-sm text-eltron-text">{formatRelativeTime(selectedCase.expires_at)}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
