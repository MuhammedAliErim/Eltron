import { useState, useCallback } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { api } from '../api/client';

export function ServerTemplatePage() {
  const { activeGuild } = useGuild();
  const [importJson, setImportJson] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    if (!activeGuild) return;
    setExportLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.template.export(activeGuild.id);
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeGuild.name.replace(/\s+/g, '_')}_template.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess('Template exported successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export template');
    } finally {
      setExportLoading(false);
    }
  }, [activeGuild]);

  const handleImport = useCallback(async () => {
    if (!activeGuild || !importJson.trim()) return;
    setImportLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const config = JSON.parse(importJson);
      await api.template.import(activeGuild.id, config);
      setSuccess('Template imported successfully.');
      setImportJson('');
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON format.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to import template');
      }
    } finally {
      setImportLoading(false);
    }
  }, [activeGuild, importJson]);

  if (!activeGuild) {
    return (
      <EmptyState
        title="No Server Selected"
        description="Select a server from the sidebar to manage templates."
        icon="Bot"
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Server Template" description={`Export and import configs for ${activeGuild.name}`} icon="Copy" />

      {error && (
        <div className="card p-4 border border-eltron-danger/30 bg-eltron-danger/5 flex items-center gap-3">
          <Icon name="AlertTriangle" size={18} className="text-eltron-danger" />
          <p className="text-sm text-eltron-danger">{error}</p>
        </div>
      )}

      {success && (
        <div className="card p-4 border border-eltron-success/30 bg-eltron-success/5 flex items-center gap-3">
          <Icon name="Check" size={18} className="text-eltron-success" />
          <p className="text-sm text-eltron-success">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-eltron-elevated">
              <Icon name="ExternalLink" size={20} className="text-eltron-accent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-eltron-text">Export Template</h3>
              <p className="text-xs text-eltron-muted">Download current server config as JSON</p>
            </div>
          </div>
          <Button variant="primary" onClick={handleExport} disabled={exportLoading}>
            {exportLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Exporting...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Icon name="ExternalLink" size={16} />
                Export Config
              </span>
            )}
          </Button>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-eltron-elevated">
              <Icon name="Copy" size={20} className="text-eltron-accent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-eltron-text">Import Template</h3>
              <p className="text-xs text-eltron-muted">Paste a JSON config to import</p>
            </div>
          </div>
          <textarea
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            placeholder='{"settings": {...}}'
            className="w-full h-40 p-3 bg-eltron-elevated border border-eltron-border rounded-lg text-sm text-eltron-text placeholder:text-eltron-muted focus:outline-none focus:border-eltron-accent font-mono resize-none mb-3"
          />
          <Button
            variant="primary"
            onClick={handleImport}
            disabled={importLoading || !importJson.trim()}
          >
            {importLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Importing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Icon name="Copy" size={16} />
                Import Config
              </span>
            )}
          </Button>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-sm font-semibold text-eltron-text mb-3">Template Sections</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: 'AutoMod Config', icon: 'Bot' as const },
            { label: 'Security Config', icon: 'Security' as const },
            { label: 'Welcome Config', icon: 'Star' as const },
            { label: 'Leveling Config', icon: 'Levels' as const },
            { label: 'Roles Config', icon: 'Moderation' as const },
            { label: 'Custom Commands', icon: 'Bot' as const },
          ].map((section) => (
            <div key={section.label} className="flex items-center gap-3 p-3 rounded-lg bg-eltron-elevated">
              <Icon name={section.icon} size={16} className="text-eltron-muted" />
              <span className="text-sm text-eltron-text">{section.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
