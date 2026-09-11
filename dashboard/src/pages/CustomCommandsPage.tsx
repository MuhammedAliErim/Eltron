import { useState, useEffect } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { useCustomCommands } from '../hooks/useCustomCommands';
import { useToast } from '../contexts/ToastContext';
import { PageHeader } from '../components/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataTable, type Column } from '../components/DataTable';
import { SearchInput } from '../components/ui/SearchInput';
import { EmptyState, ErrorDisplay, LoadingDisplay } from '../components/ui/EmptyState';
import type { CustomCommand } from '../lib/types';

const VARIABLES_REFERENCE = [
  { name: '{user}', description: 'Mentions the user' },
  { name: '{user.name}', description: 'User display name' },
  { name: '{user.id}', description: 'User ID' },
  { name: '{server}', description: 'Server name' },
  { name: '{server.id}', description: 'Server ID' },
  { name: '{channel}', description: 'Channel mention' },
  { name: '{channel.name}', description: 'Channel name' },
  { name: '{member.count}', description: 'Member count' },
  { name: '{date}', description: 'Current date' },
  { name: '{time}', description: 'Current time' },
];

export function CustomCommandsPage() {
  const { activeGuild } = useGuild();
  const guildId = activeGuild?.id ?? null;
  const { commands, loading, error, fetchCommands, createCommand, updateCommand, deleteCommand, refetch } = useCustomCommands(guildId);
  const { addToast } = useToast();

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editName, setEditName] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formResponse, setFormResponse] = useState('');
  const [formAliases, setFormAliases] = useState('');
  const [formEmbedColor, setFormEmbedColor] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingName, setDeletingName] = useState<string | null>(null);

  useEffect(() => {
    if (guildId) fetchCommands();
  }, [guildId, fetchCommands]);

  const filteredCommands = commands.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setFormName('');
    setFormResponse('');
    setFormAliases('');
    setFormEmbedColor('');
    setEditName(null);
    setShowForm(false);
  };

  const handleEdit = (cmd: CustomCommand) => {
    setEditName(cmd.name);
    setFormName(cmd.name);
    setFormResponse(cmd.response);
    setFormAliases(cmd.aliases.join(', '));
    setFormEmbedColor(cmd.embed_color ?? '');
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formName.trim() || !formResponse.trim()) {
      addToast({ type: 'error', message: 'Name and response are required.' });
      return;
    }
    const aliases = formAliases.split(',').map((a) => a.trim()).filter(Boolean);
    try {
      setSaving(true);
      if (editName) {
        await updateCommand(editName, { response: formResponse.trim(), aliases, embed_color: formEmbedColor.trim() || null });
        addToast({ type: 'success', message: 'Command updated.' });
      } else {
        await createCommand({ name: formName.trim(), response: formResponse.trim(), aliases, embed_color: formEmbedColor.trim() || null });
        addToast({ type: 'success', message: 'Command created.' });
      }
      resetForm();
    } catch {
      addToast({ type: 'error', message: editName ? 'Failed to update command.' : 'Failed to create command.' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (cmd: CustomCommand) => {
    try {
      await updateCommand(cmd.name, { enabled: !cmd.enabled });
      addToast({ type: 'success', message: `Command ${cmd.enabled ? 'disabled' : 'enabled'}.` });
    } catch {
      addToast({ type: 'error', message: 'Failed to update command.' });
    }
  };

  const handleDelete = async (cmd: CustomCommand) => {
    if (!confirm(`Delete command "${cmd.name}"?`)) return;
    try {
      setDeletingName(cmd.name);
      await deleteCommand(cmd.name);
      addToast({ type: 'success', message: 'Command deleted.' });
    } catch {
      addToast({ type: 'error', message: 'Failed to delete command.' });
    } finally {
      setDeletingName(null);
    }
  };

  const columns: Column<CustomCommand>[] = [
    {
      key: 'name',
      label: 'Name',
      render: (c) => <span className="font-medium font-mono text-eltron-accent">!{c.name}</span>,
    },
    {
      key: 'response',
      label: 'Response',
      hideOnMobile: true,
      render: (c) => <span className="truncate max-w-[250px] text-eltron-muted">{c.response}</span>,
    },
    {
      key: 'aliases',
      label: 'Aliases',
      hideOnMobile: true,
      render: (c) => (
        <div className="flex flex-wrap gap-1">
          {c.aliases.length > 0 ? c.aliases.map((a) => (
            <Badge key={a} variant="info" size="sm">{a}</Badge>
          )) : <span className="text-eltron-subtle text-xs">-</span>}
        </div>
      ),
    },
    {
      key: 'use_count',
      label: 'Uses',
      render: (c) => <span className="text-eltron-muted tabular-nums">{c.use_count}</span>,
    },
    {
      key: 'enabled',
      label: 'Enabled',
      render: (c) => (
        <Badge variant={c.enabled ? 'success' : 'default'} size="sm">{c.enabled ? 'On' : 'Off'}</Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (c) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(c)}>Edit</Button>
          <Button variant="ghost" size="sm" onClick={() => handleToggle(c)}>
            {c.enabled ? 'Disable' : 'Enable'}
          </Button>
          <Button variant="danger" size="sm" onClick={() => handleDelete(c)} disabled={deletingName === c.name}>
            {deletingName === c.name ? '...' : 'Delete'}
          </Button>
        </div>
      ),
    },
  ];

  if (!guildId) {
    return <EmptyState title="No server selected" description="Select a server from the sidebar." icon="Bot" />;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Custom Commands"
        description="Create custom text-based commands"
        icon="Bot"
        actions={
          <Button variant="primary" size="sm" onClick={() => { resetForm(); setShowForm(!showForm); }}>
            {showForm ? 'Cancel' : 'Create Command'}
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>{editName ? 'Edit Command' : 'New Command'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Command name"
                className="input w-full"
                disabled={!!editName}
              />
              <textarea
                value={formResponse}
                onChange={(e) => setFormResponse(e.target.value)}
                placeholder="Response message"
                className="input w-full min-h-[80px] resize-y"
              />
              <input
                type="text"
                value={formAliases}
                onChange={(e) => setFormAliases(e.target.value)}
                placeholder="Aliases (comma separated)"
                className="input w-full"
              />
              <input
                type="text"
                value={formEmbedColor}
                onChange={(e) => setFormEmbedColor(e.target.value)}
                placeholder="Embed color (hex, optional)"
                className="input w-full"
              />
              <Button variant="primary" size="sm" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving...' : editName ? 'Update' : 'Create'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Commands</CardTitle>
              <SearchInput value={search} onChange={setSearch} placeholder="Search commands..." className="w-60" />
            </CardHeader>
            <CardContent>
              {loading && <LoadingDisplay />}
              {!loading && error && <ErrorDisplay message={error} onRetry={refetch} />}
              {!loading && !error && (
                <DataTable
                  columns={columns}
                  data={filteredCommands}
                  keyExtractor={(c) => c.name}
                  emptyIcon="Bot"
                  emptyTitle="No custom commands"
                  emptyDescription="Create a custom command to get started."
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Variables</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {VARIABLES_REFERENCE.map((v) => (
                  <div key={v.name} className="text-xs">
                    <code className="text-eltron-accent font-mono">{v.name}</code>
                    <span className="text-eltron-subtle ml-2">{v.description}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
