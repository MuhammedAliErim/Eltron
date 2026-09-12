import { useState, useEffect, useCallback } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { useLockdowns } from '../hooks/useLockdowns';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/dashboard/StatCard';
import { DataTable, type Column } from '../components/DataTable';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { EmptyState, ErrorDisplay, LoadingDisplay } from '../components/ui/EmptyState';
import { Avatar } from '../components/ui/Avatar';
import { formatRelativeTime } from '../lib/utils';
import type { Lockdown } from '../lib/types';

export function LockdownsPage() {
  const { activeGuild } = useGuild();
  const guildId = activeGuild?.id ?? null;
  const { lockdowns, loading, error, fetchLockdowns, lock, unlock, refetch } = useLockdowns(guildId);

  const [showLockModal, setShowLockModal] = useState(false);
  const [lockChannel, setLockChannel] = useState('');
  const [lockReason, setLockReason] = useState('');
  const [lockDuration, setLockDuration] = useState('');
  const [lockAll, setLockAll] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (guildId) fetchLockdowns(); }, [guildId, fetchLockdowns]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (guildId) fetchLockdowns();
    }, 30000);
    return () => clearInterval(interval);
  }, [guildId, fetchLockdowns]);

  const handleLock = useCallback(async () => {
    if (!lockAll && !lockChannel) return;
    setSubmitting(true);
    try {
      if (lockAll) {
        await unlock({ all: true });
      } else {
        await lock({
          channel_id: lockChannel,
          reason: lockReason || undefined,
          duration_minutes: lockDuration ? parseInt(lockDuration) : undefined,
        });
      }
      setShowLockModal(false);
      setLockChannel('');
      setLockReason('');
      setLockDuration('');
      setLockAll(false);
    } catch {
    } finally {
      setSubmitting(false);
    }
  }, [lockAll, lockChannel, lockReason, lockDuration, lock, unlock]);

  const handleUnlock = useCallback(async (channelId?: string) => {
    try {
      if (channelId) {
        await unlock({ channel_id: channelId });
      } else {
        await unlock({ all: true });
      }
    } catch {
    }
  }, [unlock]);

  const columns: Column<Lockdown>[] = [
    {
      key: 'channel_id',
      label: 'Channel',
      render: (l) => (
        <span className="font-mono text-xs">{l.channel_id}</span>
      ),
    },
    {
      key: 'locked_by',
      label: 'Locked By',
      render: (l) => (
        <div className="flex items-center gap-2">
          <Avatar userId={l.locked_by} alt={l.locked_by} size="xs" />
          <span className="truncate max-w-[100px]">{l.locked_by}</span>
        </div>
      ),
    },
    {
      key: 'reason',
      label: 'Reason',
      hideOnMobile: true,
      render: (l) => (
        <span className="truncate max-w-[200px] text-eltron-muted">{l.reason || '-'}</span>
      ),
    },
    {
      key: 'duration_minutes',
      label: 'Duration',
      hideOnMobile: true,
      render: (l) => (
        <span className="text-eltron-subtle text-xs">
          {l.duration_minutes ? `${l.duration_minutes}m` : 'Permanent'}
        </span>
      ),
    },
    {
      key: 'auto_unlock',
      label: 'Auto-Unlock',
      render: (l) => (
        <Badge variant={l.auto_unlock ? 'success' : 'default'} size="sm">
          {l.auto_unlock ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      label: 'Locked At',
      render: (l) => (
        <span className="text-eltron-subtle text-xs whitespace-nowrap">{formatRelativeTime(l.created_at)}</span>
      ),
    },
  ];

  if (!guildId) {
    return <EmptyState title="No server selected" description="Select a server from the sidebar." icon="Security" />;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Lockdowns" description="Manage channel lockdowns" icon="Security" actions={
        <div className="flex gap-2">
          <button onClick={() => setShowLockModal(true)} className="btn-primary text-sm">
            Lock Channel
          </button>
          <button onClick={() => handleUnlock()} className="btn-danger text-sm" disabled={lockdowns.length === 0}>
            Unlock All
          </button>
          <button onClick={refetch} className="btn-secondary text-sm">
            Refresh
          </button>
        </div>
      } />

      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard title="Active Lockdowns" value={lockdowns.length} icon="Security" color="text-eltron-danger" />
        <StatCard title="Auto-Unlock" value={lockdowns.filter((l) => l.auto_unlock).length} icon="Clock" color="text-eltron-info" />
      </div>

      {loading && <LoadingDisplay />}
      {!loading && error && <ErrorDisplay message={error} onRetry={refetch} />}
      {!loading && !error && (
        <div className="card">
          <DataTable
            columns={columns}
            data={lockdowns}
            keyExtractor={(l) => l.id}
            onRowClick={(l) => handleUnlock(l.channel_id)}
            emptyIcon="Security"
            emptyTitle="No active lockdowns"
            emptyDescription="No channels are currently locked down."
          />
        </div>
      )}

      <Modal isOpen={showLockModal} onClose={() => setShowLockModal(false)} title="Lock Channel" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-2xs text-eltron-subtle uppercase tracking-wider mb-1">Channel ID</label>
            <input
              type="text"
              value={lockChannel}
              onChange={(e) => setLockChannel(e.target.value)}
              placeholder="Enter channel ID"
              className="input"
              disabled={lockAll}
            />
          </div>
          <div>
            <label className="block text-2xs text-eltron-subtle uppercase tracking-wider mb-1">Reason</label>
            <input
              type="text"
              value={lockReason}
              onChange={(e) => setLockReason(e.target.value)}
              placeholder="Optional reason"
              className="input"
            />
          </div>
          <div>
            <label className="block text-2xs text-eltron-subtle uppercase tracking-wider mb-1">Duration (minutes)</label>
            <input
              type="number"
              value={lockDuration}
              onChange={(e) => setLockDuration(e.target.value)}
              placeholder="Leave empty for permanent"
              className="input"
              min="1"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="lockAll"
              checked={lockAll}
              onChange={(e) => setLockAll(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="lockAll" className="text-sm text-eltron-text">Lock all channels</label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowLockModal(false)} className="btn-secondary text-sm">Cancel</button>
            <button onClick={handleLock} className="btn-primary text-sm" disabled={submitting || (!lockAll && !lockChannel)}>
              {submitting ? 'Locking...' : 'Lock'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
