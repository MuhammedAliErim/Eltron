import { useState, useEffect } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { useWelcome } from '../hooks/useWelcome';
import { useToast } from '../contexts/ToastContext';
import { PageHeader } from '../components/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState, ErrorDisplay, LoadingDisplay } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';

export function WelcomePage() {
  const { activeGuild } = useGuild();
  const guildId = activeGuild?.id ?? null;
  const { config, loading, error, fetchConfig, updateConfig, refetch } = useWelcome(guildId);
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [welcomeEnabled, setWelcomeEnabled] = useState(false);
  const [goodbyeEnabled, setGoodbyeEnabled] = useState(false);

  useEffect(() => {
    if (guildId) fetchConfig();
  }, [guildId, fetchConfig]);

  useEffect(() => {
    if (config) {
      setWelcomeEnabled(config.enabled);
      setGoodbyeEnabled(config.goodbye_enabled);
    }
  }, [config]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateConfig({ enabled: welcomeEnabled, goodbye_enabled: goodbyeEnabled });
      addToast({ type: 'success', message: 'Welcome configuration saved.' });
    } catch {
      addToast({ type: 'error', message: 'Failed to save configuration.' });
    } finally {
      setSaving(false);
    }
  };

  if (!guildId) return <EmptyState title="No server selected" description="Select a server from the sidebar." icon="Star" />;
  if (loading && !config) return <LoadingDisplay />;
  if (error) return <ErrorDisplay message={error} onRetry={refetch} />;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Welcome & Goodbye" description="Configure welcome and goodbye messages" icon="Star" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Welcome</CardTitle>
              <Badge variant={welcomeEnabled ? 'success' : 'default'}>{welcomeEnabled ? 'Enabled' : 'Disabled'}</Badge>
            </CardHeader>
            <CardContent>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={welcomeEnabled} onChange={(e) => setWelcomeEnabled(e.target.checked)} className="w-4 h-4 rounded border-eltron-border text-eltron-accent focus:ring-eltron-accent" />
                <span className="text-sm text-eltron-text">Enable welcome messages</span>
              </label>
              {config?.welcome_message && (
                <div className="mt-4 p-3 rounded-lg bg-eltron-elevated text-sm text-eltron-muted">
                  {config.welcome_message}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Goodbye</CardTitle>
              <Badge variant={goodbyeEnabled ? 'success' : 'default'}>{goodbyeEnabled ? 'Enabled' : 'Disabled'}</Badge>
            </CardHeader>
            <CardContent>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={goodbyeEnabled} onChange={(e) => setGoodbyeEnabled(e.target.checked)} className="w-4 h-4 rounded border-eltron-border text-eltron-accent focus:ring-eltron-accent" />
                <span className="text-sm text-eltron-text">Enable goodbye messages</span>
              </label>
              {config?.goodbye_message && (
                <div className="mt-4 p-3 rounded-lg bg-eltron-elevated text-sm text-eltron-muted">
                  {config.goodbye_message}
                </div>
              )}
            </CardContent>
          </Card>

          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg bg-eltron-elevated border border-eltron-border">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-eltron-accent flex items-center justify-center flex-shrink-0">
                  <Icon name="Bot" size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-eltron-text">Eltron</p>
                  <p className="text-xs text-eltron-muted mt-0.5">
                    {welcomeEnabled
                      ? (config?.welcome_message || 'Welcome to the server!').replace('{user}', '@User').replace('{server}', activeGuild?.name || 'Server')
                      : 'Welcome messages are disabled.'}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-eltron-surface text-2xs text-eltron-subtle">
              <p className="font-medium mb-1">Available variables:</p>
              <p>{'{user}'} {'{username}'} {'{server}'} {'{memberCount}'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
