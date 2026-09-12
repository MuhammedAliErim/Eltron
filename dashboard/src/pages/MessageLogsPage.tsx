import { useState, useEffect, useCallback } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { useMessageLogs } from '../hooks/useMessageLogs';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { Badge } from '../components/ui/Badge';
import { SearchInput } from '../components/ui/SearchInput';
import { FilterBar, FilterSelect } from '../components/FilterBar';
import { Pagination } from '../components/Pagination';
import { EmptyState, ErrorDisplay, LoadingDisplay } from '../components/ui/EmptyState';
import { Avatar } from '../components/ui/Avatar';
import { formatRelativeTime } from '../lib/utils';
import type { MessageLog } from '../lib/types';

const ACTION_OPTIONS = [
  { label: 'Edit', value: 'EDIT' },
  { label: 'Delete', value: 'DELETE' },
];

export function MessageLogsPage() {
  const { activeGuild } = useGuild();
  const guildId = activeGuild?.id ?? null;
  const { logs, loading, error, pagination, fetchLogs, searchLogs, refetch } = useMessageLogs(guildId);

  const [actionFilter, setActionFilter] = useState('');
  const [authorFilter, setAuthorFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchData = useCallback(() => {
    fetchLogs({
      page,
      limit: 25,
      action: actionFilter || undefined,
      author: authorFilter || undefined,
      channel: channelFilter || undefined,
    });
  }, [fetchLogs, page, actionFilter, authorFilter, channelFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (guildId) fetchData();
    }, 30000);
    return () => clearInterval(interval);
  }, [guildId, fetchData]);

  const handleSearch = useCallback(() => {
    if (search) {
      searchLogs(search);
    } else {
      fetchData();
    }
  }, [search, searchLogs, fetchData]);

  useEffect(() => {
    const timeout = setTimeout(handleSearch, 300);
    return () => clearTimeout(timeout);
  }, [search, handleSearch]);

  const columns: Column<MessageLog>[] = [
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
        <Badge variant={log.action === 'DELETE' ? 'danger' : 'warning'} size="sm">{log.action}</Badge>
      ),
    },
    {
      key: 'author_id',
      label: 'Author',
      render: (log) => (
        <div className="flex items-center gap-2">
          <Avatar userId={log.author_id} alt={log.author_id} size="xs" />
          <span className="truncate max-w-[100px]">{log.author_id}</span>
        </div>
      ),
    },
    {
      key: 'channel_id',
      label: 'Channel',
      hideOnMobile: true,
      render: (log) => (
        <span className="font-mono text-xs text-eltron-subtle">{log.channel_id}</span>
      ),
    },
    {
      key: 'new_content',
      label: 'Content',
      hideOnMobile: true,
      render: (log) => (
        <div className="truncate max-w-[250px] text-sm">
          {log.action === 'EDIT' && log.old_content ? (
            <span>
              <span className="text-eltron-danger line-through">{log.old_content.slice(0, 50)}</span>
              <span className="text-eltron-muted mx-1">→</span>
              <span className="text-eltron-success">{(log.new_content || '').slice(0, 50)}</span>
            </span>
          ) : (
            <span className="text-eltron-muted">{(log.old_content || log.new_content || '').slice(0, 80)}</span>
          )}
        </div>
      ),
    },
  ];

  if (!guildId) {
    return <EmptyState title="No server selected" description="Select a server from the sidebar." icon="Message" />;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Message Logs" description="Track message edits and deletions" icon="Message" actions={
        <button onClick={refetch} className="btn-secondary text-sm">
          Refresh
        </button>
      } />

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by content..." />
        <FilterSelect label="Action" options={ACTION_OPTIONS} value={actionFilter} onChange={(v) => { setActionFilter(v); setPage(1); }} />
        <SearchInput value={authorFilter} onChange={(v) => { setAuthorFilter(v); setPage(1); }} placeholder="Author ID..." className="w-44" />
        <SearchInput value={channelFilter} onChange={(v) => { setChannelFilter(v); setPage(1); }} placeholder="Channel ID..." className="w-44" />
      </FilterBar>

      {loading && <LoadingDisplay />}
      {!loading && error && <ErrorDisplay message={error} onRetry={refetch} />}
      {!loading && !error && (
        <>
          <div className="card">
            <DataTable
              columns={columns}
              data={logs}
              keyExtractor={(log) => log.id}
              emptyIcon="Message"
              emptyTitle="No message logs"
              emptyDescription="No message edits or deletions recorded yet."
            />
          </div>
          {pagination && (
            <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
          )}
        </>
      )}
    </div>
  );
}
