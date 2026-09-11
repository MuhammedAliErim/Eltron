import { useState, useEffect } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { useCounting } from '../hooks/useCounting';
import { useToast } from '../contexts/ToastContext';
import { PageHeader } from '../components/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataTable, type Column } from '../components/DataTable';
import { EmptyState, ErrorDisplay, LoadingDisplay } from '../components/ui/EmptyState';
import type { CountingScore } from '../lib/types';

export function CountingPage() {
  const { activeGuild } = useGuild();
  const guildId = activeGuild?.id ?? null;
  const { config, scores, loading, error, fetchConfig, updateConfig, fetchScores, refetch } = useCounting(guildId);
  const { addToast } = useToast();

  const [formChannelId, setFormChannelId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (guildId) {
      fetchConfig();
      fetchScores();
    }
  }, [guildId, fetchConfig, fetchScores]);

  useEffect(() => {
    if (config) {
      setFormChannelId(config.channel_id ?? '');
    }
  }, [config]);

  const handleToggle = async () => {
    if (!config) return;
    try {
      setSaving(true);
      await updateConfig({ enabled: !config.enabled });
      addToast({ type: 'success', message: `Counting ${config.enabled ? 'disabled' : 'enabled'}.` });
    } catch {
      addToast({ type: 'error', message: 'Failed to update counting config.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveChannel = async () => {
    try {
      setSaving(true);
      await updateConfig({ channel_id: formChannelId || null });
      addToast({ type: 'success', message: 'Channel updated.' });
    } catch {
      addToast({ type: 'error', message: 'Failed to update channel.' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset the current number to 0?')) return;
    try {
      setSaving(true);
      await updateConfig({ current_number: 0 });
      addToast({ type: 'success', message: 'Current number reset to 0.' });
    } catch {
      addToast({ type: 'error', message: 'Failed to reset number.' });
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<CountingScore>[] = [
    {
      key: 'user_id',
      label: 'User',
      render: (s) => <span className="font-mono text-xs">{s.user_id}</span>,
    },
    {
      key: 'score',
      label: 'Score',
      render: (s) => <span className="font-semibold text-eltron-accent tabular-nums">{s.score}</span>,
    },
    {
      key: 'correct_count',
      label: 'Correct',
      render: (s) => <span className="text-green-400 tabular-nums">{s.correct_count}</span>,
    },
    {
      key: 'wrong_count',
      label: 'Wrong',
      render: (s) => <span className="text-red-400 tabular-nums">{s.wrong_count}</span>,
    },
  ];

  if (!guildId) {
    return <EmptyState title="No server selected" description="Select a server from the sidebar." icon="Analytics" />;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Counting Game"
        description="Manage the counting game for your server"
        icon="Analytics"
      />

      {loading && <LoadingDisplay />}
      {!loading && error && <ErrorDisplay message={error} onRetry={refetch} />}
      {!loading && !error && config && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant={config.enabled ? 'success' : 'default'} size="sm">
                    {config.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={handleToggle} disabled={saving}>
                    {config.enabled ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Number</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-eltron-accent tabular-nums">{config.current_number}</div>
                <Button variant="ghost" size="sm" className="mt-2" onClick={handleReset} disabled={saving}>
                  Reset to 0
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Highest Number</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-eltron-accent tabular-nums">{config.highest_number}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Channel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={formChannelId}
                    onChange={(e) => setFormChannelId(e.target.value)}
                    placeholder="Channel ID"
                    className="input flex-1"
                  />
                  <Button variant="primary" size="sm" onClick={handleSaveChannel} disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Leaderboard</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={columns}
                  data={scores.slice(0, 10)}
                  keyExtractor={(s) => s.user_id}
                  emptyIcon="Analytics"
                  emptyTitle="No scores yet"
                  emptyDescription="Scores will appear here once players start counting."
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
