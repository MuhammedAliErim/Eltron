import { useState, useEffect } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { useTags } from '../hooks/useTags';
import { useToast } from '../contexts/ToastContext';
import { PageHeader } from '../components/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataTable, type Column } from '../components/DataTable';
import { SearchInput } from '../components/ui/SearchInput';
import { EmptyState, ErrorDisplay, LoadingDisplay } from '../components/ui/EmptyState';
import type { Tag } from '../lib/types';

export function TagsPage() {
  const { activeGuild } = useGuild();
  const guildId = activeGuild?.id ?? null;
  const { tags, loading, error, fetchTags, createTag, updateTag, deleteTag, refetch } = useTags(guildId);
  const { addToast } = useToast();

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formAliases, setFormAliases] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (guildId) fetchTags();
  }, [guildId, fetchTags]);

  const filteredTags = tags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setFormName('');
    setFormContent('');
    setFormAliases('');
    setEditId(null);
    setShowForm(false);
  };

  const handleEdit = (tag: Tag) => {
    setEditId(tag.id);
    setFormName(tag.name);
    setFormContent(tag.content);
    setFormAliases(tag.aliases.join(', '));
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formName.trim() || !formContent.trim()) {
      addToast({ type: 'error', message: 'Name and content are required.' });
      return;
    }
    const aliases = formAliases.split(',').map((a) => a.trim()).filter(Boolean);
    try {
      setSaving(true);
      if (editId) {
        await updateTag(editId, { name: formName.trim(), content: formContent.trim(), aliases });
        addToast({ type: 'success', message: 'Tag updated.' });
      } else {
        await createTag({ name: formName.trim(), content: formContent.trim(), aliases });
        addToast({ type: 'success', message: 'Tag created.' });
      }
      resetForm();
    } catch {
      addToast({ type: 'error', message: editId ? 'Failed to update tag.' : 'Failed to create tag.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tag: Tag) => {
    if (!confirm(`Delete tag "${tag.name}"?`)) return;
    try {
      setDeletingId(tag.id);
      await deleteTag(tag.id);
      addToast({ type: 'success', message: 'Tag deleted.' });
    } catch {
      addToast({ type: 'error', message: 'Failed to delete tag.' });
    } finally {
      setDeletingId(null);
    }
  };

  const columns: Column<Tag>[] = [
    {
      key: 'name',
      label: 'Name',
      render: (t) => <span className="font-medium">{t.name}</span>,
    },
    {
      key: 'content',
      label: 'Content',
      hideOnMobile: true,
      render: (t) => <span className="truncate max-w-[250px] text-eltron-muted">{t.content}</span>,
    },
    {
      key: 'aliases',
      label: 'Aliases',
      hideOnMobile: true,
      render: (t) => (
        <div className="flex flex-wrap gap-1">
          {t.aliases.length > 0 ? t.aliases.map((a) => (
            <Badge key={a} variant="info" size="sm">{a}</Badge>
          )) : <span className="text-eltron-subtle text-xs">-</span>}
        </div>
      ),
    },
    {
      key: 'use_count',
      label: 'Uses',
      render: (t) => <span className="text-eltron-muted tabular-nums">{t.use_count}</span>,
    },
    {
      key: 'created_by',
      label: 'Created By',
      hideOnMobile: true,
      render: (t) => <span className="font-mono text-xs text-eltron-subtle">{t.created_by}</span>,
    },
    {
      key: 'actions',
      label: '',
      render: (t) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(t)}>Edit</Button>
          <Button variant="danger" size="sm" onClick={() => handleDelete(t)} disabled={deletingId === t.id}>
            {deletingId === t.id ? '...' : 'Delete'}
          </Button>
        </div>
      ),
    },
  ];

  if (!guildId) {
    return <EmptyState title="No server selected" description="Select a server from the sidebar." icon="Copy" />;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Tags"
        description="Manage reusable text snippets"
        icon="Copy"
        actions={
          <Button variant="primary" size="sm" onClick={() => { resetForm(); setShowForm(!showForm); }}>
            {showForm ? 'Cancel' : 'Create Tag'}
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>{editId ? 'Edit Tag' : 'New Tag'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Tag name"
                className="input w-full"
              />
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Tag content"
                className="input w-full min-h-[80px] resize-y"
              />
              <input
                type="text"
                value={formAliases}
                onChange={(e) => setFormAliases(e.target.value)}
                placeholder="Aliases (comma separated)"
                className="input w-full"
              />
              <Button variant="primary" size="sm" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving...' : editId ? 'Update' : 'Create'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
          <SearchInput value={search} onChange={setSearch} placeholder="Search tags..." className="w-60" />
        </CardHeader>
        <CardContent>
          {loading && <LoadingDisplay />}
          {!loading && error && <ErrorDisplay message={error} onRetry={refetch} />}
          {!loading && !error && (
            <DataTable
              columns={columns}
              data={filteredTags}
              keyExtractor={(t) => t.id}
              emptyIcon="Copy"
              emptyTitle="No tags"
              emptyDescription="Create a tag to get started."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
