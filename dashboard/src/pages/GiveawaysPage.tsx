import { useState, useEffect, useCallback } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { useGiveaways } from '../hooks/useGiveaways';
import { PageHeader } from '../components/PageHeader';
import { Tabs } from '../components/ui/Tabs';
import { DataTable, type Column } from '../components/DataTable';
import { Badge } from '../components/ui/Badge';
import { FilterBar, FilterSelect } from '../components/FilterBar';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/Pagination';
import { EmptyState, ErrorDisplay, LoadingDisplay } from '../components/ui/EmptyState';
import { formatRelativeTime } from '../lib/utils';
import { GIVEAWAY_STATUSES } from '../lib/constants';
import type { Giveaway } from '../lib/types';

const STATUS_VARIANTS: Record<string, 'success' | 'default' | 'danger'> = {
  ACTIVE: 'success',
  ENDED: 'default',
  CANCELLED: 'danger',
};

export function GiveawaysPage() {
  const { activeGuild } = useGuild();
  const guildId = activeGuild?.id ?? null;
  const { giveaways, currentGiveaway, loading, error, pagination, fetchGiveaways, getGiveaway, refetch } = useGiveaways(guildId);

  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedGiveaway, setSelectedGiveaway] = useState<Giveaway | null>(null);

  const fetchData = useCallback(() => {
    const status = activeTab === 'all' ? undefined : activeTab;
    fetchGiveaways({ page, pageSize: 20, status });
  }, [fetchGiveaways, page, activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns: Column<Giveaway>[] = [
    { key: 'prize', label: 'Prize', render: (g) => <span className="font-medium truncate max-w-[200px]">{g.prize}</span> },
    { key: 'winner_count', label: 'Winners', render: (g) => <span className="tabular-nums">{g.winner_count}</span> },
    { key: 'status', label: 'Status', render: (g) => (
      <Badge variant={STATUS_VARIANTS[g.status] || 'default'} size="sm">{g.status}</Badge>
    )},
    { key: 'ends_at', label: 'Ends', render: (g) => (
      <span className="text-eltron-subtle text-xs whitespace-nowrap">{formatRelativeTime(g.ends_at)}</span>
    )},
  ];

  if (!guildId) return <EmptyState title="No server selected" description="Select a server from the sidebar." icon="Giveaways" />;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Giveaways" description="Manage giveaways" icon="Giveaways" />

      <Tabs tabs={[
        { id: 'all', label: 'All' },
        { id: 'ACTIVE', label: 'Active' },
        { id: 'ENDED', label: 'Ended' },
        { id: 'CANCELLED', label: 'Cancelled' },
      ]} activeTab={activeTab} onChange={(id) => { setActiveTab(id); setPage(1); }} className="mb-6" />

      {loading && <LoadingDisplay />}
      {!loading && error && <ErrorDisplay message={error} onRetry={refetch} />}
      {!loading && !error && (
        <>
          <div className="card">
            <DataTable columns={columns} data={giveaways} keyExtractor={(g) => g.id} onRowClick={(g) => { setSelectedGiveaway(g); getGiveaway(g.id); }} emptyIcon="Giveaways" emptyTitle="No giveaways" emptyDescription="No giveaways found." />
          </div>
          {pagination && <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />}
        </>
      )}

      <Modal isOpen={!!selectedGiveaway} onClose={() => setSelectedGiveaway(null)} title="Giveaway Details" size="lg">
        {currentGiveaway && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><span className="text-eltron-subtle">Prize:</span> <span className="text-eltron-text ml-2 font-medium">{currentGiveaway.prize}</span></div>
              {currentGiveaway.description && <div className="col-span-2"><span className="text-eltron-subtle">Description:</span> <span className="text-eltron-text ml-2">{currentGiveaway.description}</span></div>}
              <div><span className="text-eltron-subtle">Winners:</span> <span className="text-eltron-text ml-2">{currentGiveaway.winner_count}</span></div>
              <div><span className="text-eltron-subtle">Status:</span> <Badge variant={STATUS_VARIANTS[currentGiveaway.status] || 'default'} size="sm" className="ml-2">{currentGiveaway.status}</Badge></div>
              <div><span className="text-eltron-subtle">Created:</span> <span className="text-eltron-text ml-2">{formatRelativeTime(currentGiveaway.created_at)}</span></div>
              <div><span className="text-eltron-subtle">Ends:</span> <span className="text-eltron-text ml-2">{formatRelativeTime(currentGiveaway.ends_at)}</span></div>
            </div>
            {currentGiveaway.entries && currentGiveaway.entries.length > 0 && (
              <div>
                <p className="text-2xs text-eltron-subtle uppercase tracking-wider mb-2">Entries ({currentGiveaway.entries.length})</p>
                <div className="flex flex-wrap gap-1">
                  {currentGiveaway.entries.slice(0, 20).map((e) => (
                    <Badge key={e.id} variant="default" size="sm">{e.user_id}</Badge>
                  ))}
                  {currentGiveaway.entries.length > 20 && <Badge variant="default" size="sm">+{currentGiveaway.entries.length - 20} more</Badge>}
                </div>
              </div>
            )}
            {currentGiveaway.winners && currentGiveaway.winners.length > 0 && (
              <div>
                <p className="text-2xs text-eltron-subtle uppercase tracking-wider mb-2">Winners</p>
                <div className="flex flex-wrap gap-1">
                  {currentGiveaway.winners.map((w) => (
                    <Badge key={w.id} variant="success" size="sm">{w.user_id}</Badge>
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
