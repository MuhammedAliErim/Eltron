import { useState, useEffect } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { useGuildSettings } from '../hooks/useGuildSettings';
import { useToast } from '../contexts/ToastContext';
import { PageHeader } from '../components/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState, ErrorDisplay, LoadingDisplay } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';

export function SettingsPage() {
  const { activeGuild } = useGuild();
  const guildId = activeGuild?.id ?? null;
  const { settings, loading, error, fetchSettings, updateSettings, refetch } = useGuildSettings(guildId);
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [language, setLanguage] = useState('en');
  const [timezone, setTimezone] = useState('UTC');
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (guildId) fetchSettings();
  }, [guildId, fetchSettings]);

  useEffect(() => {
    if (settings) {
      setLanguage(settings.language || 'en');
      setTimezone(settings.timezone || 'UTC');
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateSettings({ language, timezone });
      addToast({ type: 'success', message: 'Settings saved successfully.' });
    } catch {
      addToast({ type: 'error', message: 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (!guildId) return <EmptyState title="No server selected" description="Select a server from the sidebar." icon="Settings" />;
  if (loading && !settings) return <LoadingDisplay />;
  if (error) return <ErrorDisplay message={error} onRetry={refetch} />;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Settings" description="Bot configuration and preferences" icon="Settings" />

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-eltron-text mb-1.5">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-eltron-elevated border border-eltron-border text-sm text-eltron-text focus:outline-none focus:ring-2 focus:ring-eltron-accent"
                >
                  <option value="en">English</option>
                  <option value="tr">Turkish</option>
                  <option value="de">German</option>
                  <option value="fr">French</option>
                  <option value="es">Spanish</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-eltron-text mb-1.5">Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-eltron-elevated border border-eltron-border text-sm text-eltron-text focus:outline-none focus:ring-2 focus:ring-eltron-accent"
                >
                  <option value="UTC">UTC</option>
                  <option value="Europe/Istanbul">Europe/Istanbul</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="America/Los_Angeles">America/Los_Angeles</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="Asia/Tokyo">Asia/Tokyo</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>

        <Card className="border-eltron-danger/30">
          <CardHeader>
            <CardTitle className="text-eltron-danger">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-eltron-muted mb-3">Reset all guild settings to defaults. This action cannot be undone.</p>
            <Button variant="danger" size="sm" onClick={() => setConfirmReset(true)}>
              Reset Settings
            </Button>
          </CardContent>
        </Card>
      </div>

      <Modal isOpen={confirmReset} onClose={() => setConfirmReset(false)} title="Confirm Reset" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-eltron-muted">Are you sure you want to reset all settings to defaults? This action cannot be undone.</p>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => { setConfirmReset(false); addToast({ type: 'success', message: 'Settings reset.' }); }}>Reset</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
