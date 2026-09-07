import { useState, useEffect } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { useSecurity } from '../hooks/useSecurity';
import { useToast } from '../contexts/ToastContext';
import { PageHeader } from '../components/PageHeader';
import { Tabs } from '../components/ui/Tabs';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataTable, type Column } from '../components/DataTable';
import { EmptyState, ErrorDisplay, LoadingDisplay } from '../components/ui/EmptyState';
import type { QuarantineLog } from '../lib/types';
import { formatRelativeTime } from '../lib/utils';

const TABS = [
  { id: 'antiraid', label: 'Anti-Raid' },
  { id: 'quarantine', label: 'Quarantine' },
  { id: 'verification', label: 'Verification' },
  { id: 'channelwarning', label: 'Channel Warning' },
];

export function SecurityPage() {
  const { activeGuild } = useGuild();
  const guildId = activeGuild?.id ?? null;
  const { config, quarantineLogs, loading, error, fetchConfig, updateAntiRaid, fetchQuarantineLogs, refetch } = useSecurity(guildId);
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('antiraid');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (guildId) {
      fetchConfig();
      fetchQuarantineLogs();
    }
  }, [guildId, fetchConfig, fetchQuarantineLogs]);

  const handleSave = async (updater: (body: Record<string, unknown>) => Promise<unknown>, body: Record<string, unknown>) => {
    try {
      setSaving(true);
      await updater(body);
      addToast({ type: 'success', message: 'Configuration saved.' });
    } catch {
      addToast({ type: 'error', message: 'Failed to save configuration.' });
    } finally {
      setSaving(false);
    }
  };

  const logColumns: Column<QuarantineLog>[] = [
    { key: 'user_id', label: 'User', render: (l) => <span className="font-mono text-xs">{l.user_id}</span> },
    { key: 'action', label: 'Action', render: (l) => <Badge variant="warning" size="sm">{l.action}</Badge> },
    { key: 'reason', label: 'Reason', hideOnMobile: true, render: (l) => <span className="text-eltron-muted truncate max-w-[200px]">{l.reason || '-'}</span> },
    { key: 'created_at', label: 'Date', render: (l) => <span className="text-eltron-subtle text-xs whitespace-nowrap">{formatRelativeTime(l.created_at)}</span> },
  ];

  if (!guildId) return <EmptyState title="No server selected" description="Select a server from the sidebar." icon="Security" />;
  if (loading && !config) return <LoadingDisplay />;
  if (error) return <ErrorDisplay message={error} onRetry={refetch} />;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Security" description="Anti-raid, quarantine, and verification settings" icon="Security" />

      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} className="mb-6" />

      {activeTab === 'antiraid' && config?.antiRaid && (
        <Card>
          <CardHeader>
            <CardTitle>Anti-Raid Configuration</CardTitle>
            <Badge variant={config.antiRaid.enabled ? 'success' : 'default'}>
              {config.antiRaid.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><span className="text-eltron-subtle">Max joins/min:</span> <span className="text-eltron-text ml-2">{config.antiRaid.max_joins_per_minute}</span></div>
              <div><span className="text-eltron-subtle">Max joins/5min:</span> <span className="text-eltron-text ml-2">{config.antiRaid.max_joins_per_5_minutes}</span></div>
              <div><span className="text-eltron-subtle">Action:</span> <Badge variant="info" size="sm" className="ml-2">{config.antiRaid.action}</Badge></div>
              <div><span className="text-eltron-subtle">Detection:</span> <Badge variant={config.antiRaid.detection_enabled ? 'success' : 'default'} size="sm" className="ml-2">{config.antiRaid.detection_enabled ? 'On' : 'Off'}</Badge></div>
            </div>
            <div className="mt-4">
              <Button variant="primary" size="sm" onClick={() => handleSave(updateAntiRaid, { enabled: !config.antiRaid.enabled })} disabled={saving}>
                {config.antiRaid.enabled ? 'Disable Anti-Raid' : 'Enable Anti-Raid'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'quarantine' && config?.quarantine && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quarantine Configuration</CardTitle>
              <Badge variant={config.quarantine.enabled ? 'success' : 'default'}>
                {config.quarantine.enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><span className="text-eltron-subtle">Default duration:</span> <span className="text-eltron-text ml-2">{config.quarantine.default_duration}s</span></div>
                <div><span className="text-eltron-subtle">Auto release:</span> <Badge variant={config.quarantine.auto_release ? 'success' : 'default'} size="sm" className="ml-2">{config.quarantine.auto_release ? 'Yes' : 'No'}</Badge></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Quarantine Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable columns={logColumns} data={quarantineLogs} keyExtractor={(l) => l.id} emptyIcon="Shield" emptyTitle="No quarantine logs" emptyDescription="No quarantine actions recorded." />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'verification' && config?.verification && (
        <Card>
          <CardHeader>
            <CardTitle>Verification Configuration</CardTitle>
            <Badge variant={config.verification.enabled ? 'success' : 'default'}>
              {config.verification.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><span className="text-eltron-subtle">Method:</span> <Badge variant="info" size="sm" className="ml-2">{config.verification.method}</Badge></div>
              <div><span className="text-eltron-subtle">Timeout:</span> <span className="text-eltron-text ml-2">{config.verification.timeout_minutes} min</span></div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'channelwarning' && config?.channelWarning && (
        <Card>
          <CardHeader>
            <CardTitle>Channel Warning Configuration</CardTitle>
            <Badge variant={config.channelWarning.enabled ? 'success' : 'default'}>
              {config.channelWarning.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><span className="text-eltron-subtle">Max slowmode:</span> <span className="text-eltron-text ml-2">{config.channelWarning.max_slowmode}s</span></div>
              <div><span className="text-eltron-subtle">Slowmode increment:</span> <span className="text-eltron-text ml-2">{config.channelWarning.slowmode_increment}s</span></div>
              <div><span className="text-eltron-subtle">Alert threshold:</span> <span className="text-eltron-text ml-2">{config.channelWarning.alert_threshold}</span></div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
