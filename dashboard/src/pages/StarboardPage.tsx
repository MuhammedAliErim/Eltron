import { useState, useEffect, useCallback } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { useStarboard } from '../hooks/useStarboard';
import { PageHeader } from '../components/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { StatCard } from '../components/dashboard/StatCard';
import { DataTable, type Column } from '../components/DataTable';
import { EmptyState, ErrorDisplay, LoadingDisplay } from '../components/ui/EmptyState';
import { Avatar } from '../components/ui/Avatar';
import { formatRelativeTime } from '../lib/utils';
import type { StarboardEntry } from '../lib/types';

export function StarboardPage() {
  const { activeGuild } = useGuild();
  const guildId = activeGuild?.id ?? null;
  const { config, topEntries, loading, error, fetchConfig, updateConfig, fetchTop, refetch } = useStarboard(guildId);

  const [channelId, setChannelId] = useState('');
  const [threshold, setThreshold] = useState('');
  const [emoji, setEmoji] = useState('');
  const [selfStar, setSelfStar] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (guildId) {
      fetchConfig();
      fetchTop();
    }
  }, [guildId, fetchConfig, fetchTop]);

  useEffect(() => {
    if (config) {
      setChannelId(config.channel_id || '');
      setThreshold(String(config.threshold));
      setEmoji(config.emoji);
      setSelfStar(config.self_star);
    }
  }, [config]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await updateConfig({
        enabled: config?.enabled ?? true,
        channel_id: channelId || null,
        threshold: parseInt(threshold) || 3,
        emoji: emoji || '⭐',
        self_star: selfStar,
      });
    } catch {
    } finally {
      setSaving(false);
    }
  }, [config, channelId, threshold, emoji, selfStar, updateConfig]);

  const handleToggle = useCallback(async () => {
    if (!config) return;
    try {
      await updateConfig({ enabled: !config.enabled });
    } catch {
    }
  }, [config, updateConfig]);

  const topColumns: Column<StarboardEntry>[] = [
    {
      key: 'star_count',
      label: 'Stars',
      render: (e) => (
        <span className="font-mono text-eltron-warning font-medium">{e.star_count} ⭐</span>
      ),
    },
    {
      key: 'author_id',
      label: 'Author',
      render: (e) => (
        <div className="flex items-center gap-2">
          <Avatar userId={e.author_id} alt={e.author_id} size="xs" />
          <span className="truncate max-w-[100px]">{e.author_id}</span>
        </div>
      ),
    },
    {
      key: 'content',
      label: 'Content',
      hideOnMobile: true,
      render: (e) => (
        <span className="truncate max-w-[250px] text-sm text-eltron-muted">{e.content}</span>
      ),
    },
    {
      key: 'channel_id',
      label: 'Channel',
      hideOnMobile: true,
      render: (e) => (
        <span className="font-mono text-xs text-eltron-subtle">{e.channel_id}</span>
      ),
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (e) => (
        <span className="text-eltron-subtle text-xs whitespace-nowrap">{formatRelativeTime(e.created_at)}</span>
      ),
    },
  ];

  if (!guildId) {
    return <EmptyState title="No server selected" description="Select a server from the sidebar." icon="Star" />;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Starboard" description="Configure and manage the starboard" icon="Star" actions={
        <button onClick={refetch} className="btn-secondary text-sm">
          Refresh
        </button>
      } />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard title="Status" value={config?.enabled ? 1 : 0} icon="Star" color={config?.enabled ? 'text-eltron-success' : 'text-eltron-muted'} />
        <StatCard title="Threshold" value={config?.threshold ?? 3} icon="Analytics" color="text-eltron-warning" />
        <StatCard title="Starred Messages" value={topEntries.length} icon="Message" color="text-eltron-info" />
        <StatCard title="Emoji Code" value={0} icon="Star" />
      </div>

      {loading && <LoadingDisplay />}
      {!loading && error && <ErrorDisplay message={error} onRetry={refetch} />}
      {!loading && !error && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Configuration</CardTitle>
                <button onClick={handleToggle} className={`text-sm px-3 py-1 rounded-lg transition-colors ${config?.enabled ? 'bg-eltron-success/20 text-eltron-success hover:bg-eltron-success/30' : 'bg-eltron-muted/20 text-eltron-muted hover:bg-eltron-muted/30'}`}>
                  {config?.enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs text-eltron-subtle uppercase tracking-wider mb-1">Channel ID</label>
                  <input
                    type="text"
                    value={channelId}
                    onChange={(e) => setChannelId(e.target.value)}
                    placeholder="Enter channel ID"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-2xs text-eltron-subtle uppercase tracking-wider mb-1">Star Threshold</label>
                  <input
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    placeholder="3"
                    className="input"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-2xs text-eltron-subtle uppercase tracking-wider mb-1">Emoji</label>
                  <input
                    type="text"
                    value={emoji}
                    onChange={(e) => setEmoji(e.target.value)}
                    placeholder="⭐"
                    className="input"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer pb-2">
                    <input
                      type="checkbox"
                      checked={selfStar}
                      onChange={(e) => setSelfStar(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-eltron-text">Allow self-star</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <button onClick={handleSave} className="btn-primary text-sm" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Starred Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={topColumns}
                data={topEntries}
                keyExtractor={(e) => e.id}
                emptyIcon="Star"
                emptyTitle="No starred messages"
                emptyDescription="No messages have been starred yet."
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
