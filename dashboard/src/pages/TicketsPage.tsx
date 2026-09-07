import { useState, useEffect, useCallback } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { useTickets } from '../hooks/useTickets';
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
import { TICKET_STATUSES } from '../lib/constants';
import type { Ticket } from '../lib/types';

const STATUS_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
  OPEN: 'success',
  CLAIMED: 'info',
  CLOSED: 'default',
};

export function TicketsPage() {
  const { activeGuild } = useGuild();
  const guildId = activeGuild?.id ?? null;
  const { tickets, loading, error, pagination, fetchTickets, refetch } = useTickets(guildId);

  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const fetchData = useCallback(() => {
    fetchTickets({ page, pageSize: 20, status: statusFilter || undefined });
  }, [fetchTickets, page, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = tickets.filter((t) =>
    !search || t.subject.toLowerCase().includes(search.toLowerCase()) || t.creator_id.includes(search)
  );

  const openCount = tickets.filter((t) => t.status === 'OPEN').length;
  const claimedCount = tickets.filter((t) => t.status === 'CLAIMED').length;
  const closedCount = tickets.filter((t) => t.status === 'CLOSED').length;

  const columns: Column<Ticket>[] = [
    { key: 'id', label: 'ID', render: (t) => <span className="font-mono text-eltron-subtle">#{t.id}</span> },
    { key: 'subject', label: 'Subject', render: (t) => <span className="font-medium truncate max-w-[200px]">{t.subject}</span> },
    { key: 'category', label: 'Category', hideOnMobile: true, render: (t) => <Badge variant="info" size="sm">{t.category}</Badge> },
    { key: 'creator_id', label: 'Creator', render: (t) => (
      <div className="flex items-center gap-2">
        <Avatar userId={t.creator_id} alt={t.creator_id} size="xs" />
        <span className="truncate max-w-[100px]">{t.creator_id}</span>
      </div>
    )},
    { key: 'status', label: 'Status', render: (t) => (
      <Badge variant={STATUS_VARIANTS[t.status] || 'default'} size="sm">{t.status}</Badge>
    )},
    { key: 'created_at', label: 'Created', render: (t) => (
      <span className="text-eltron-subtle text-xs whitespace-nowrap">{formatRelativeTime(t.created_at)}</span>
    )},
  ];

  if (!guildId) return <EmptyState title="No server selected" description="Select a server from the sidebar." icon="Tickets" />;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Tickets" description="Manage support tickets" icon="Tickets" />

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard title="Open" value={openCount} icon="Tickets" color="text-eltron-success" />
        <StatCard title="Claimed" value={claimedCount} icon="Users" color="text-eltron-info" />
        <StatCard title="Closed" value={closedCount} icon="X" color="text-eltron-muted" />
      </div>

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search tickets..." />
        <FilterSelect label="Status" options={TICKET_STATUSES} value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }} />
      </FilterBar>

      {loading && <LoadingDisplay />}
      {!loading && error && <ErrorDisplay message={error} onRetry={refetch} />}
      {!loading && !error && (
        <>
          <div className="card">
            <DataTable columns={columns} data={filtered} keyExtractor={(t) => t.id} onRowClick={setSelectedTicket} emptyIcon="Tickets" emptyTitle="No tickets" emptyDescription="No tickets found." />
          </div>
          {pagination && <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />}
        </>
      )}

      <Modal isOpen={!!selectedTicket} onClose={() => setSelectedTicket(null)} title={`Ticket #${selectedTicket?.id}`} size="lg">
        {selectedTicket && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-eltron-subtle">Subject:</span> <span className="text-eltron-text ml-2">{selectedTicket.subject}</span></div>
              <div><span className="text-eltron-subtle">Category:</span> <Badge variant="info" size="sm" className="ml-2">{selectedTicket.category}</Badge></div>
              <div><span className="text-eltron-subtle">Status:</span> <Badge variant={STATUS_VARIANTS[selectedTicket.status] || 'default'} size="sm" className="ml-2">{selectedTicket.status}</Badge></div>
              <div><span className="text-eltron-subtle">Creator:</span> <span className="text-eltron-text ml-2">{selectedTicket.creator_id}</span></div>
              {selectedTicket.assigned_to && <div><span className="text-eltron-subtle">Assigned:</span> <span className="text-eltron-text ml-2">{selectedTicket.assigned_to}</span></div>}
              <div><span className="text-eltron-subtle">Created:</span> <span className="text-eltron-text ml-2">{formatRelativeTime(selectedTicket.created_at)}</span></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
