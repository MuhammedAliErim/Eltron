import { useState, useEffect, useCallback } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { useApplications } from '../hooks/useApplications';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { Badge } from '../components/ui/Badge';
import { FilterBar, FilterSelect } from '../components/FilterBar';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/Pagination';
import { EmptyState, ErrorDisplay, LoadingDisplay } from '../components/ui/EmptyState';
import { Avatar } from '../components/ui/Avatar';
import { formatRelativeTime } from '../lib/utils';
import { APPLICATION_STATUSES, APPLICATION_TYPES } from '../lib/constants';
import type { Application } from '../lib/types';

const STATUS_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  DRAFT: 'default',
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

export function ApplicationsPage() {
  const { activeGuild } = useGuild();
  const guildId = activeGuild?.id ?? null;
  const { applications, currentApplication, loading, error, pagination, fetchApplications, getApplication, refetch } = useApplications(guildId);

  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  const fetchData = useCallback(() => {
    fetchApplications({ page, pageSize: 20, status: statusFilter || undefined, type: typeFilter || undefined });
  }, [fetchApplications, page, statusFilter, typeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns: Column<Application>[] = [
    { key: 'applicant_id', label: 'Applicant', render: (a) => (
      <div className="flex items-center gap-2">
        <Avatar userId={a.applicant_id} alt={a.applicant_id} size="xs" />
        <span className="truncate max-w-[120px]">{a.applicant_id}</span>
      </div>
    )},
    { key: 'type', label: 'Type', render: (a) => <Badge variant="info" size="sm">{a.type}</Badge> },
    { key: 'status', label: 'Status', render: (a) => (
      <Badge variant={STATUS_VARIANTS[a.status] || 'default'} size="sm">{a.status}</Badge>
    )},
    { key: 'created_at', label: 'Submitted', render: (a) => (
      <span className="text-eltron-subtle text-xs whitespace-nowrap">{formatRelativeTime(a.created_at)}</span>
    )},
    { key: 'reviewed_at', label: 'Reviewed', hideOnMobile: true, render: (a) => (
      <span className="text-eltron-subtle text-xs whitespace-nowrap">{a.reviewed_at ? formatRelativeTime(a.reviewed_at) : '-'}</span>
    )},
  ];

  if (!guildId) return <EmptyState title="No server selected" description="Select a server from the sidebar." icon="Applications" />;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Applications" description="Review staff and role applications" icon="Applications" />

      <FilterBar>
        <FilterSelect label="Status" options={APPLICATION_STATUSES} value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }} />
        <FilterSelect label="Type" options={APPLICATION_TYPES} value={typeFilter} onChange={(v) => { setTypeFilter(v); setPage(1); }} />
      </FilterBar>

      {loading && <LoadingDisplay />}
      {!loading && error && <ErrorDisplay message={error} onRetry={refetch} />}
      {!loading && !error && (
        <>
          <div className="card">
            <DataTable columns={columns} data={applications} keyExtractor={(a) => a.id} onRowClick={(a) => { setSelectedApp(a); getApplication(a.id); }} emptyIcon="Applications" emptyTitle="No applications" emptyDescription="No applications found." />
          </div>
          {pagination && <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />}
        </>
      )}

      <Modal isOpen={!!selectedApp} onClose={() => setSelectedApp(null)} title="Application Details" size="lg">
        {currentApplication && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-eltron-subtle">Applicant:</span> <span className="text-eltron-text ml-2">{currentApplication.applicant_id}</span></div>
              <div><span className="text-eltron-subtle">Type:</span> <Badge variant="info" size="sm" className="ml-2">{currentApplication.type}</Badge></div>
              <div><span className="text-eltron-subtle">Status:</span> <Badge variant={STATUS_VARIANTS[currentApplication.status] || 'default'} size="sm" className="ml-2">{currentApplication.status}</Badge></div>
              <div><span className="text-eltron-subtle">Submitted:</span> <span className="text-eltron-text ml-2">{formatRelativeTime(currentApplication.created_at)}</span></div>
            </div>
            {currentApplication.answers && currentApplication.answers.length > 0 && (
              <div>
                <p className="text-2xs text-eltron-subtle uppercase tracking-wider mb-2">Answers</p>
                <div className="space-y-3">
                  {currentApplication.answers.map((ans) => (
                    <div key={ans.id} className="p-3 rounded-lg bg-eltron-elevated">
                      <p className="text-xs font-medium text-eltron-subtle mb-1">{ans.question}</p>
                      <p className="text-sm text-eltron-text">{ans.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
