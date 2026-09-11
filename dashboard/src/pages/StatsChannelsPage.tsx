import { useState, useEffect } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { useStatsChannels } from '../hooks/useStatsChannels';
import { useToast } from '../contexts/ToastContext';
import { PageHeader } from '../components/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataTable, type Column } from '../components/DataTable';
import { EmptyState, ErrorDisplay, LoadingDisplay } from '../components/ui/EmptyState';
import type { StatsChannel } from '../lib/types';

const CHANNEL_TYPES = [
  { label: 'Member Count', value: 'member_count' },
  { label: 'Online Members', value: 'online_count' },
  { label: 'Channel Count', value: 'channel_count' },
  { label: 'Role Count', value: 'role_count' },
  { label: 'Boost Count', value: 'boost_count' },
];

export function StatsChannelsPage() {
  const { activeGuild } = useGuild();
  const guildId = activeGuild?.id ?? null;
  const { channels, loading, error, fetchChannels, createChannel, deleteChannel, forceUpdate, refetch } = useStatsChannels(guildId);
  const { addToast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [formChannelId, setFormChannelId] = useState('');
  const [formType, setFormType] = useState('member_count');
  const [formFormat, setFormFormat] = useState('{count}');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (guildId) fetchChannels();
  }, [guildId, fetchChannels]);

  const handleCreate = async () => {
    if (!formChannelId.trim()) {
      addToast({ type: 'error', message: 'Channel ID is required.' });
      return;
    }
    try {
      setSaving(true);
      await createChannel({ channel_id: formChannelId.trim(), type: formType, format: formFormat.trim() });
      addToast({ type: 'success', message: 'Stats channel created.' });
      setShowForm(false);
      setFormChannelId('');
      setFormType('member_count');
      setFormFormat('{count}');
    } catch {
      addToast({ type: 'error', message: 'Failed to create stats channel.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ch: StatsChannel) => {
    if (!confirm(`Delete stats channel #${ch.channel_name}?`)) return;
    try {
      setDeletingId(ch.id);
      await deleteChannel(ch.id);
      addToast({ type: 'success', message: 'Stats channel deleted.' });
    } catch {
      addToast({ type: 'error', message: 'Failed to delete stats channel.' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleForceUpdate = async (ch: StatsChannel) => {
    try {
      setUpdatingId(ch.id);
      await forceUpdate(ch.id);
      addToast({ type: 'success', message: 'Stats channel updated.' });
    } catch {
      addToast({ type: 'error', message: 'Failed to update stats channel.' });
    } finally {
      setUpdatingId(null);
    }
  };

  const columns: Column<StatsChannel>[] = [
    {
      key: 'channel_name',
      label: 'Channel',
      render: (ch) => <span className="font-medium">#{ch.channel_name}</span>,
    },
    {
      key: 'type',
      label: 'Type',
      render: (ch) => <Badge variant="info" size="sm">{ch.type}</Badge>,
    },
    {
      key: 'format',
      label: 'Format',
      hideOnMobile: true,
      render: (ch) => <span className="font-mono text-xs text-eltron-muted">{ch.format}</span>,
    },
    {
      key: 'last_updated',
      label: 'Last Updated',
      hideOnMobile: true,
      render: (ch) => (
        <span className="text-eltron-subtle text-xs">
          {ch.last_updated ? new Date(ch.last_updated).toLocaleString() : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (ch) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleForceUpdate(ch)} disabled={updatingId === ch.id}>
            {updatingId === ch.id ? '...' : 'Update'}
          </Button>
          <Button variant="danger" size="sm" onClick={() => handleDelete(ch)} disabled={deletingId === ch.id}>
            {deletingId === ch.id ? '...' : 'Delete'}
          </Button>
        </div>
      ),
    },
  ];

  if (!guildId) {
    return <EmptyState title="No server selected" description="Select a server from the sidebar." icon="Analytics" />;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Stats Channels"
        description="Manage auto-updating statistics channels"
        icon="Analytics"
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : 'Create Stats Channel'}
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>New Stats Channel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <input
                type="text"
                value={formChannelId}
                onChange={(e) => setFormChannelId(e.target.value)}
                placeholder="Channel ID"
                className="input w-full"
              />
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="input w-full"
              >
                {CHANNEL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <input
                type="text"
                value={formFormat}
                onChange={(e) => setFormFormat(e.target.value)}
                placeholder="Format (e.g. Members: {count})"
                className="input w-full"
              />
              <Button variant="primary" size="sm" onClick={handleCreate} disabled={saving}>
                {saving ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Stats Channels</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <LoadingDisplay />}
          {!loading && error && <ErrorDisplay message={error} onRetry={refetch} />}
          {!loading && !error && (
            <DataTable
              columns={columns}
              data={channels}
              keyExtractor={(ch) => ch.id}
              emptyIcon="Analytics"
              emptyTitle="No stats channels"
              emptyDescription="Create a stats channel to get started."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
