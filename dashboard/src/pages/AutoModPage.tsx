import { useState, useEffect, useCallback } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { useAutoMod } from '../hooks/useAutoMod';
import { useToast } from '../contexts/ToastContext';
import { PageHeader } from '../components/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataTable, type Column } from '../components/DataTable';
import { EmptyState, ErrorDisplay, LoadingDisplay } from '../components/ui/EmptyState';
import type { AutoModRule } from '../lib/types';

export function AutoModPage() {
  const { activeGuild } = useGuild();
  const guildId = activeGuild?.id ?? null;
  const { config, rules, loading, error, fetchConfig, updateConfig, fetchRules, refetch } = useAutoMod(guildId);
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (guildId) {
      fetchConfig();
      fetchRules();
    }
  }, [guildId, fetchConfig, fetchRules]);

  const handleToggle = async (enabled: boolean) => {
    try {
      setSaving(true);
      await updateConfig({ enabled });
      addToast({ type: 'success', message: `AutoMod ${enabled ? 'enabled' : 'disabled'}.` });
    } catch {
      addToast({ type: 'error', message: 'Failed to update AutoMod config.' });
    } finally {
      setSaving(false);
    }
  };

  const ruleColumns: Column<AutoModRule>[] = [
    { key: 'name', label: 'Rule', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'trigger_type', label: 'Type', render: (r) => <Badge variant="info" size="sm">{r.trigger_type}</Badge> },
    { key: 'action_type', label: 'Action', render: (r) => <Badge variant="warning" size="sm">{r.action_type}</Badge> },
    { key: 'enabled', label: 'Status', render: (r) => (
      <Badge variant={r.enabled ? 'success' : 'default'} size="sm">{r.enabled ? 'Active' : 'Disabled'}</Badge>
    )},
  ];

  if (!guildId) {
    return <EmptyState title="No server selected" description="Select a server from the sidebar." icon="Bot" />;
  }

  if (loading && !config) return <LoadingDisplay />;
  if (error) return <ErrorDisplay message={error} onRetry={refetch} />;

  return (
    <div className="animate-fade-in">
      <PageHeader title="AutoMod" description="Configure automatic moderation rules" icon="Bot" />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>AutoMod Status</CardTitle>
            <div className="flex items-center gap-3">
              <Badge variant={config?.enabled ? 'success' : 'default'}>
                {config?.enabled ? 'Enabled' : 'Disabled'}
              </Badge>
              <Button
                variant={config?.enabled ? 'danger' : 'primary'}
                size="sm"
                onClick={() => handleToggle(!config?.enabled)}
                disabled={saving}
              >
                {config?.enabled ? 'Disable' : 'Enable'}
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={ruleColumns}
              data={rules}
              keyExtractor={(r) => r.id}
              emptyIcon="Bot"
              emptyTitle="No rules configured"
              emptyDescription="AutoMod rules will appear here."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
