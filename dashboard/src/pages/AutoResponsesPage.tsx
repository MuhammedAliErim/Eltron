import { useState, useEffect } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { useAutoResponses } from '../hooks/useAutoResponses';
import { useToast } from '../contexts/ToastContext';
import { PageHeader } from '../components/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataTable, type Column } from '../components/DataTable';
import { SearchInput } from '../components/ui/SearchInput';
import { EmptyState, ErrorDisplay, LoadingDisplay } from '../components/ui/EmptyState';
import { AUTO_RESPONSE_MATCH_TYPES } from '../lib/constants';
import type { AutoResponse } from '../lib/types';

export function AutoResponsesPage() {
  const { activeGuild } = useGuild();
  const guildId = activeGuild?.id ?? null;
  const { responses, loading, error, fetchResponses, createResponse, updateResponse, deleteResponse, refetch } = useAutoResponses(guildId);
  const { addToast } = useToast();

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formTrigger, setFormTrigger] = useState('');
  const [formResponse, setFormResponse] = useState('');
  const [formMatchType, setFormMatchType] = useState('EXACT');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (guildId) fetchResponses();
  }, [guildId, fetchResponses]);

  const filteredResponses = responses.filter((r) =>
    r.trigger.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!formTrigger.trim() || !formResponse.trim()) {
      addToast({ type: 'error', message: 'Trigger and response are required.' });
      return;
    }
    try {
      setSaving(true);
      await createResponse({
        trigger: formTrigger.trim(),
        response: formResponse.trim(),
        match_type: formMatchType,
        enabled: true,
      });
      addToast({ type: 'success', message: 'Auto-response created.' });
      setShowForm(false);
      setFormTrigger('');
      setFormResponse('');
      setFormMatchType('EXACT');
    } catch {
      addToast({ type: 'error', message: 'Failed to create auto-response.' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item: AutoResponse) => {
    try {
      await updateResponse(item.id, { enabled: !item.enabled });
      addToast({ type: 'success', message: `Auto-response ${item.enabled ? 'disabled' : 'enabled'}.` });
    } catch {
      addToast({ type: 'error', message: 'Failed to update auto-response.' });
    }
  };

  const handleDelete = async (item: AutoResponse) => {
    if (!confirm(`Delete auto-response "${item.trigger}"?`)) return;
    try {
      setDeletingId(item.id);
      await deleteResponse(item.id);
      addToast({ type: 'success', message: 'Auto-response deleted.' });
    } catch {
      addToast({ type: 'error', message: 'Failed to delete auto-response.' });
    } finally {
      setDeletingId(null);
    }
  };

  const MATCH_TYPE_VARIANTS: Record<string, 'info' | 'success' | 'warning' | 'default'> = {
    EXACT: 'info',
    CONTAINS: 'success',
    STARTS_WITH: 'warning',
    REGEX: 'default',
  };

  const columns: Column<AutoResponse>[] = [
    {
      key: 'trigger',
      label: 'Trigger',
      render: (r) => <span className="font-medium">{r.trigger}</span>,
    },
    {
      key: 'response',
      label: 'Response',
      hideOnMobile: true,
      render: (r) => <span className="truncate max-w-[250px] text-eltron-muted">{r.response}</span>,
    },
    {
      key: 'match_type',
      label: 'Match Type',
      render: (r) => (
        <Badge variant={MATCH_TYPE_VARIANTS[r.match_type] || 'default'} size="sm">{r.match_type}</Badge>
      ),
    },
    {
      key: 'enabled',
      label: 'Enabled',
      render: (r) => (
        <Badge variant={r.enabled ? 'success' : 'default'} size="sm">{r.enabled ? 'On' : 'Off'}</Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleToggle(r)}>
            {r.enabled ? 'Disable' : 'Enable'}
          </Button>
          <Button variant="danger" size="sm" onClick={() => handleDelete(r)} disabled={deletingId === r.id}>
            {deletingId === r.id ? '...' : 'Delete'}
          </Button>
        </div>
      ),
    },
  ];

  if (!guildId) {
    return <EmptyState title="No server selected" description="Select a server from the sidebar." icon="Message" />;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Auto-Responses"
        description="Configure automatic message replies"
        icon="Message"
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : 'Create Response'}
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>New Auto-Response</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <input
                type="text"
                value={formTrigger}
                onChange={(e) => setFormTrigger(e.target.value)}
                placeholder="Trigger (exact phrase or pattern)"
                className="input w-full"
              />
              <textarea
                value={formResponse}
                onChange={(e) => setFormResponse(e.target.value)}
                placeholder="Response message"
                className="input w-full min-h-[80px] resize-y"
              />
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-eltron-subtle font-medium">Match:</span>
                  <select
                    value={formMatchType}
                    onChange={(e) => setFormMatchType(e.target.value)}
                    className="input"
                  >
                    {AUTO_RESPONSE_MATCH_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <Button variant="primary" size="sm" onClick={handleCreate} disabled={saving}>
                  {saving ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Responses</CardTitle>
          <SearchInput value={search} onChange={setSearch} placeholder="Search triggers..." className="w-60" />
        </CardHeader>
        <CardContent>
          {loading && <LoadingDisplay />}
          {!loading && error && <ErrorDisplay message={error} onRetry={refetch} />}
          {!loading && !error && (
            <DataTable
              columns={columns}
              data={filteredResponses}
              keyExtractor={(r) => r.id}
              emptyIcon="Message"
              emptyTitle="No auto-responses"
              emptyDescription="Create an auto-response to get started."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
