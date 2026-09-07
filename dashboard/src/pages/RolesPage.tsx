import { useState, useEffect } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { useRoles } from '../hooks/useRoles';
import { useToast } from '../contexts/ToastContext';
import { PageHeader } from '../components/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState, ErrorDisplay, LoadingDisplay } from '../components/ui/EmptyState';

export function RolesPage() {
  const { activeGuild } = useGuild();
  const guildId = activeGuild?.id ?? null;
  const { config, loading, error, fetchConfig, updateConfig, refetch } = useRoles(guildId);
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (guildId) fetchConfig();
  }, [guildId, fetchConfig]);

  useEffect(() => {
    if (config) setEnabled(config.enabled);
  }, [config]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateConfig({ enabled });
      addToast({ type: 'success', message: 'Auto-role configuration saved.' });
    } catch {
      addToast({ type: 'error', message: 'Failed to save configuration.' });
    } finally {
      setSaving(false);
    }
  };

  if (!guildId) return <EmptyState title="No server selected" description="Select a server from the sidebar." icon="Moderation" />;
  if (loading && !config) return <LoadingDisplay />;
  if (error) return <ErrorDisplay message={error} onRetry={refetch} />;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Roles" description="Manage auto-roles" icon="Moderation" />

      <Card>
        <CardHeader>
          <CardTitle>Auto-Role</CardTitle>
          <Badge variant={enabled ? 'success' : 'default'}>{enabled ? 'Enabled' : 'Disabled'}</Badge>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="w-4 h-4 rounded border-eltron-border text-eltron-accent focus:ring-eltron-accent" />
              <span className="text-sm text-eltron-text">Automatically assign role to new members</span>
            </label>

            {config?.role_id && (
              <div className="p-3 rounded-lg bg-eltron-elevated">
                <p className="text-xs text-eltron-subtle mb-1">Current role</p>
                <p className="text-sm text-eltron-text font-mono">{config.role_id}</p>
              </div>
            )}

            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
