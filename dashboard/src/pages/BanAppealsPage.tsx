import { useState, useEffect, useCallback } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { useBanAppeals } from '../hooks/useBanAppeals';
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
import type { BanAppeal } from '../lib/types';

const STATUS_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  DENIED: 'danger',
};

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Denied', value: 'DENIED' },
];

export function BanAppealsPage() {
  const { activeGuild } = useGuild();
  const guildId = activeGuild?.id ?? null;
  const { appeals, loading, error, pagination, fetchAppeals, reviewAppeal, refetch } = useBanAppeals(guildId);

  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedAppeal, setSelectedAppeal] = useState<BanAppeal | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const fetchData = useCallback(() => {
    fetchAppeals({ status: statusFilter || undefined, page });
  }, [fetchAppeals, statusFilter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (guildId) fetchData();
    }, 30000);
    return () => clearInterval(interval);
  }, [guildId, fetchData]);

  const filtered = appeals.filter((a) =>
    !search || a.user_id.includes(search) || a.reason.toLowerCase().includes(search.toLowerCase())
  );

  const pendingCount = appeals.filter((a) => a.status === 'PENDING').length;
  const approvedCount = appeals.filter((a) => a.status === 'APPROVED').length;
  const deniedCount = appeals.filter((a) => a.status === 'DENIED').length;

  const handleReview = useCallback(async (status: 'APPROVED' | 'DENIED') => {
    if (!selectedAppeal) return;
    setReviewing(true);
    try {
      await reviewAppeal(selectedAppeal.id, { status, note: reviewNote || undefined });
      setSelectedAppeal(null);
      setReviewNote('');
    } catch {
    } finally {
      setReviewing(false);
    }
  }, [selectedAppeal, reviewNote, reviewAppeal]);

  const columns: Column<BanAppeal>[] = [
    {
      key: 'user_id',
      label: 'User',
      render: (a) => (
        <div className="flex items-center gap-2">
          <Avatar userId={a.user_id} alt={a.user_id} size="xs" />
          <span className="truncate max-w-[120px]">{a.user_id}</span>
        </div>
      ),
    },
    {
      key: 'reason',
      label: 'Reason',
      hideOnMobile: true,
      render: (a) => (
        <span className="truncate max-w-[200px] text-eltron-muted">{a.reason}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (a) => (
        <Badge variant={STATUS_VARIANTS[a.status] || 'default'} size="sm">{a.status}</Badge>
      ),
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (a) => (
        <span className="text-eltron-subtle text-xs whitespace-nowrap">{formatRelativeTime(a.created_at)}</span>
      ),
    },
    {
      key: 'reviewer',
      label: 'Reviewer',
      hideOnMobile: true,
      render: (a) => (
        <span className="text-eltron-subtle text-xs">{a.reviewer || '-'}</span>
      ),
    },
  ];

  if (!guildId) {
    return <EmptyState title="No server selected" description="Select a server from the sidebar." icon="Shield" />;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Ban Appeals" description="Review and manage ban appeal requests" icon="Shield" actions={
        <button onClick={refetch} className="btn-secondary text-sm">
          Refresh
        </button>
      } />

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard title="Pending" value={pendingCount} icon="AlertTriangle" color="text-eltron-warning" />
        <StatCard title="Approved" value={approvedCount} icon="Check" color="text-eltron-success" />
        <StatCard title="Denied" value={deniedCount} icon="X" color="text-eltron-danger" />
      </div>

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by user ID or reason..." />
        <FilterSelect label="Status" options={STATUS_OPTIONS} value={statusFilter} onChange={(v) => setStatusFilter(v)} />
      </FilterBar>

      {loading && <LoadingDisplay />}
      {!loading && error && <ErrorDisplay message={error} onRetry={refetch} />}
      {!loading && !error && (
        <>
          <div className="card">
            <DataTable
              columns={columns}
              data={filtered}
              keyExtractor={(a) => a.id}
              onRowClick={setSelectedAppeal}
              emptyIcon="Shield"
              emptyTitle="No ban appeals"
              emptyDescription="No ban appeals have been submitted yet."
            />
          </div>
          {pagination && (
            <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
          )}
        </>
      )}

      <Modal isOpen={!!selectedAppeal} onClose={() => setSelectedAppeal(null)} title="Review Ban Appeal" size="lg">
        {selectedAppeal && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xs text-eltron-subtle uppercase tracking-wider mb-1">User</p>
                <div className="flex items-center gap-2">
                  <Avatar userId={selectedAppeal.user_id} alt={selectedAppeal.user_id} size="sm" />
                  <span className="text-sm text-eltron-text">{selectedAppeal.user_id}</span>
                </div>
              </div>
              <div>
                <p className="text-2xs text-eltron-subtle uppercase tracking-wider mb-1">Status</p>
                <Badge variant={STATUS_VARIANTS[selectedAppeal.status] || 'default'}>{selectedAppeal.status}</Badge>
              </div>
              <div className="col-span-2">
                <p className="text-2xs text-eltron-subtle uppercase tracking-wider mb-1">Reason</p>
                <p className="text-sm text-eltron-text">{selectedAppeal.reason}</p>
              </div>
              {selectedAppeal.review_note && (
                <div className="col-span-2">
                  <p className="text-2xs text-eltron-subtle uppercase tracking-wider mb-1">Review Note</p>
                  <p className="text-sm text-eltron-text">{selectedAppeal.review_note}</p>
                </div>
              )}
              <div>
                <p className="text-2xs text-eltron-subtle uppercase tracking-wider mb-1">Submitted</p>
                <p className="text-sm text-eltron-text">{formatRelativeTime(selectedAppeal.created_at)}</p>
              </div>
              {selectedAppeal.reviewed_at && (
                <div>
                  <p className="text-2xs text-eltron-subtle uppercase tracking-wider mb-1">Reviewed</p>
                  <p className="text-sm text-eltron-text">{formatRelativeTime(selectedAppeal.reviewed_at)}</p>
                </div>
              )}
            </div>
            {selectedAppeal.status === 'PENDING' && (
              <div className="border-t border-eltron-border pt-4">
                <label className="block text-2xs text-eltron-subtle uppercase tracking-wider mb-1">Review Note (optional)</label>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Add a note about your decision..."
                  className="input min-h-[80px] resize-none"
                />
                <div className="flex justify-end gap-2 mt-3">
                  <button onClick={() => handleReview('DENIED')} className="btn-danger text-sm" disabled={reviewing}>
                    {reviewing ? 'Reviewing...' : 'Deny'}
                  </button>
                  <button onClick={() => handleReview('APPROVED')} className="btn-primary text-sm" disabled={reviewing}>
                    {reviewing ? 'Reviewing...' : 'Approve'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
