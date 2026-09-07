import { useState, useEffect, useCallback } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { usePolls } from '../hooks/usePolls';
import { PageHeader } from '../components/PageHeader';
import { Tabs } from '../components/ui/Tabs';
import { DataTable, type Column } from '../components/DataTable';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/Pagination';
import { EmptyState, ErrorDisplay, LoadingDisplay } from '../components/ui/EmptyState';
import { formatRelativeTime } from '../lib/utils';
import { POLL_STATUSES } from '../lib/constants';
import type { Poll } from '../lib/types';

const STATUS_VARIANTS: Record<string, 'success' | 'default' | 'danger'> = {
  ACTIVE: 'success',
  ENDED: 'default',
  CANCELLED: 'danger',
};

export function PollsPage() {
  const { activeGuild } = useGuild();
  const guildId = activeGuild?.id ?? null;
  const { polls, currentPoll, loading, error, pagination, fetchPolls, getPoll, refetch } = usePolls(guildId);

  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);

  const fetchData = useCallback(() => {
    const status = activeTab === 'all' ? undefined : activeTab;
    fetchPolls({ page, pageSize: 20, status });
  }, [fetchPolls, page, activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns: Column<Poll>[] = [
    { key: 'question', label: 'Question', render: (p) => <span className="font-medium truncate max-w-[250px]">{p.question}</span> },
    { key: 'status', label: 'Status', render: (p) => (
      <Badge variant={STATUS_VARIANTS[p.status] || 'default'} size="sm">{p.status}</Badge>
    )},
    { key: 'anonymous', label: 'Type', hideOnMobile: true, render: (p) => (
      <Badge variant={p.anonymous ? 'info' : 'default'} size="sm">{p.anonymous ? 'Anonymous' : 'Public'}</Badge>
    )},
    { key: 'ends_at', label: 'Ends', render: (p) => (
      <span className="text-eltron-subtle text-xs whitespace-nowrap">{p.ends_at ? formatRelativeTime(p.ends_at) : '-'}</span>
    )},
  ];

  if (!guildId) return <EmptyState title="No server selected" description="Select a server from the sidebar." icon="Analytics" />;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Polls" description="Manage polls" icon="Analytics" />

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
            <DataTable columns={columns} data={polls} keyExtractor={(p) => p.id} onRowClick={(p) => { setSelectedPoll(p); getPoll(p.id); }} emptyIcon="Analytics" emptyTitle="No polls" emptyDescription="No polls found." />
          </div>
          {pagination && <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />}
        </>
      )}

      <Modal isOpen={!!selectedPoll} onClose={() => setSelectedPoll(null)} title="Poll Details" size="lg">
        {currentPoll && (
          <div className="space-y-4 text-sm">
            <div>
              <span className="text-eltron-subtle">Question:</span>
              <p className="text-eltron-text font-medium mt-1">{currentPoll.question}</p>
            </div>
            <div className="flex gap-4">
              <div><span className="text-eltron-subtle">Status:</span> <Badge variant={STATUS_VARIANTS[currentPoll.status] || 'default'} size="sm" className="ml-2">{currentPoll.status}</Badge></div>
              <div><span className="text-eltron-subtle">Type:</span> <Badge variant={currentPoll.anonymous ? 'info' : 'default'} size="sm" className="ml-2">{currentPoll.anonymous ? 'Anonymous' : 'Public'}</Badge></div>
            </div>
            {currentPoll.results && currentPoll.results.length > 0 && (
              <div>
                <p className="text-2xs text-eltron-subtle uppercase tracking-wider mb-2">Results</p>
                <div className="space-y-2">
                  {currentPoll.results.map((r) => {
                    const totalVotes = currentPoll.results!.reduce((sum, x) => sum + x.vote_count, 0);
                    const pct = totalVotes > 0 ? Math.round((r.vote_count / totalVotes) * 100) : 0;
                    return (
                      <div key={r.option_id} className="p-2 rounded-lg bg-eltron-elevated">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-eltron-text">{r.text}</span>
                          <span className="text-eltron-subtle">{r.vote_count} votes ({pct}%)</span>
                        </div>
                        <div className="h-1.5 bg-eltron-border rounded-full overflow-hidden">
                          <div className="h-full bg-eltron-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
