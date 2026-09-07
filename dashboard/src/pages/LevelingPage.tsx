import { useState, useEffect, useCallback } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { useLeveling } from '../hooks/useLeveling';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/dashboard/StatCard';
import { DataTable, type Column } from '../components/DataTable';
import { SearchInput } from '../components/ui/SearchInput';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/Pagination';
import { EmptyState, ErrorDisplay, LoadingDisplay } from '../components/ui/EmptyState';
import { Avatar } from '../components/ui/Avatar';
import { formatNumber } from '../lib/utils';
import type { LeaderboardEntry } from '../lib/types';

export function LevelingPage() {
  const { activeGuild } = useGuild();
  const guildId = activeGuild?.id ?? null;
  const { leaderboard, userXP, loading, error, pagination, fetchLeaderboard, getUser, refetch } = useLeveling(guildId);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    fetchLeaderboard({ page, pageSize: 20 });
  }, [fetchLeaderboard, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns: Column<LeaderboardEntry>[] = [
    { key: 'rank', label: 'Rank', render: (e) => (
      <span className="font-mono text-eltron-subtle w-8 text-center">{e.rank || '-'}</span>
    )},
    { key: 'user_id', label: 'User', render: (e) => (
      <div className="flex items-center gap-2">
        <Avatar userId={e.user_id} alt={e.user_id} size="sm" />
        <span>{e.user_id}</span>
      </div>
    )},
    { key: 'level', label: 'Level', render: (e) => (
      <span className="font-medium text-eltron-accent">{e.level}</span>
    )},
    { key: 'xp', label: 'XP', render: (e) => (
      <span className="tabular-nums">{formatNumber(e.xp)}</span>
    )},
    { key: 'message_count', label: 'Messages', hideOnMobile: true, render: (e) => (
      <span className="tabular-nums text-eltron-subtle">{formatNumber(e.message_count)}</span>
    )},
  ];

  if (!guildId) return <EmptyState title="No server selected" description="Select a server from the sidebar." icon="Levels" />;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Leveling" description="XP and leaderboard" icon="Levels" />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <StatCard title="Active Users" value={leaderboard.length} icon="Members" />
        <StatCard title="Total XP" value={leaderboard.reduce((sum, e) => sum + e.xp, 0)} icon="Levels" color="text-eltron-accent" />
      </div>

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by user ID..." />
      </div>

      {loading && <LoadingDisplay />}
      {!loading && error && <ErrorDisplay message={error} onRetry={refetch} />}
      {!loading && !error && (
        <>
          <div className="card">
            <DataTable
              columns={columns}
              data={leaderboard.filter((e) => !search || e.user_id.includes(search))}
              keyExtractor={(e) => e.user_id}
              onRowClick={(e) => { setSelectedUser(e.user_id); getUser(e.user_id); }}
              emptyIcon="Levels"
              emptyTitle="No leaderboard data"
              emptyDescription="No XP data recorded yet."
            />
          </div>
          {pagination && <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />}
        </>
      )}

      <Modal isOpen={!!selectedUser} onClose={() => setSelectedUser(null)} title="User Details">
        {userXP && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <Avatar userId={userXP.user_id} alt={userXP.user_id} size="lg" />
              <div>
                <p className="font-medium text-eltron-text">{userXP.user_id}</p>
                <p className="text-eltron-subtle text-xs">Rank #{userXP.rank || '-'}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-eltron-elevated">
                <p className="text-2xl font-bold text-eltron-accent">{userXP.level}</p>
                <p className="text-2xs text-eltron-subtle">Level</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-eltron-elevated">
                <p className="text-2xl font-bold text-eltron-text">{formatNumber(userXP.xp)}</p>
                <p className="text-2xs text-eltron-subtle">XP</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-eltron-elevated">
                <p className="text-2xl font-bold text-eltron-text">{formatNumber(userXP.message_count)}</p>
                <p className="text-2xs text-eltron-subtle">Messages</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
