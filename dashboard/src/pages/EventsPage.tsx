import { useState, useEffect, useCallback } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { useEvents } from '../hooks/useEvents';
import { PageHeader } from '../components/PageHeader';
import { Tabs } from '../components/ui/Tabs';
import { DataTable, type Column } from '../components/DataTable';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/Pagination';
import { EmptyState, ErrorDisplay, LoadingDisplay } from '../components/ui/EmptyState';
import { formatRelativeTime } from '../lib/utils';
import { EVENT_STATUSES } from '../lib/constants';
import type { Event } from '../lib/types';

const STATUS_VARIANTS: Record<string, 'success' | 'info' | 'default' | 'danger'> = {
  UPCOMING: 'info',
  ACTIVE: 'success',
  ENDED: 'default',
  CANCELLED: 'danger',
};

export function EventsPage() {
  const { activeGuild } = useGuild();
  const guildId = activeGuild?.id ?? null;
  const { events, currentEvent, loading, error, pagination, fetchEvents, getEvent, refetch } = useEvents(guildId);

  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const fetchData = useCallback(() => {
    const status = activeTab === 'all' ? undefined : activeTab;
    fetchEvents({ page, pageSize: 20, status });
  }, [fetchEvents, page, activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns: Column<Event>[] = [
    { key: 'title', label: 'Title', render: (e) => <span className="font-medium truncate max-w-[200px]">{e.title}</span> },
    { key: 'status', label: 'Status', render: (e) => (
      <Badge variant={STATUS_VARIANTS[e.status] || 'default'} size="sm">{e.status}</Badge>
    )},
    { key: 'start_time', label: 'Starts', render: (e) => (
      <span className="text-eltron-subtle text-xs whitespace-nowrap">{formatRelativeTime(e.start_time)}</span>
    )},
    { key: 'max_participants', label: 'Max', hideOnMobile: true, render: (e) => (
      <span className="tabular-nums">{e.max_participants || '-'}</span>
    )},
  ];

  if (!guildId) return <EmptyState title="No server selected" description="Select a server from the sidebar." icon="Calendar" />;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Events" description="Manage server events" icon="Calendar" />

      <Tabs tabs={[
        { id: 'all', label: 'All' },
        { id: 'UPCOMING', label: 'Upcoming' },
        { id: 'ACTIVE', label: 'Active' },
        { id: 'ENDED', label: 'Ended' },
        { id: 'CANCELLED', label: 'Cancelled' },
      ]} activeTab={activeTab} onChange={(id) => { setActiveTab(id); setPage(1); }} className="mb-6" />

      {loading && <LoadingDisplay />}
      {!loading && error && <ErrorDisplay message={error} onRetry={refetch} />}
      {!loading && !error && (
        <>
          <div className="card">
            <DataTable columns={columns} data={events} keyExtractor={(e) => e.id} onRowClick={(e) => { setSelectedEvent(e); getEvent(e.id); }} emptyIcon="Calendar" emptyTitle="No events" emptyDescription="No events found." />
          </div>
          {pagination && <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />}
        </>
      )}

      <Modal isOpen={!!selectedEvent} onClose={() => setSelectedEvent(null)} title="Event Details" size="lg">
        {currentEvent && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><span className="text-eltron-subtle">Title:</span> <span className="text-eltron-text ml-2 font-medium">{currentEvent.title}</span></div>
              {currentEvent.description && <div className="col-span-2"><span className="text-eltron-subtle">Description:</span> <span className="text-eltron-text ml-2">{currentEvent.description}</span></div>}
              <div><span className="text-eltron-subtle">Status:</span> <Badge variant={STATUS_VARIANTS[currentEvent.status] || 'default'} size="sm" className="ml-2">{currentEvent.status}</Badge></div>
              <div><span className="text-eltron-subtle">Creator:</span> <span className="text-eltron-text ml-2">{currentEvent.creator_id}</span></div>
              <div><span className="text-eltron-subtle">Starts:</span> <span className="text-eltron-text ml-2">{formatRelativeTime(currentEvent.start_time)}</span></div>
              {currentEvent.end_time && <div><span className="text-eltron-subtle">Ends:</span> <span className="text-eltron-text ml-2">{formatRelativeTime(currentEvent.end_time)}</span></div>}
            </div>
            {currentEvent.participants && currentEvent.participants.length > 0 && (
              <div>
                <p className="text-2xs text-eltron-subtle uppercase tracking-wider mb-2">Participants ({currentEvent.participants.length})</p>
                <div className="flex flex-wrap gap-1">
                  {currentEvent.participants.slice(0, 20).map((p) => (
                    <Badge key={p.id} variant="default" size="sm">{p.user_id}</Badge>
                  ))}
                  {currentEvent.participants.length > 20 && <Badge variant="default" size="sm">+{currentEvent.participants.length - 20} more</Badge>}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
