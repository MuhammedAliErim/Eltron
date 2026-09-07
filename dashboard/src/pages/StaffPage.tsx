import { useState, useEffect } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { useStaff } from '../hooks/useStaff';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/dashboard/StatCard';
import { DataTable, type Column } from '../components/DataTable';
import { Badge } from '../components/ui/Badge';
import { SearchInput } from '../components/ui/SearchInput';
import { EmptyState, ErrorDisplay, LoadingDisplay } from '../components/ui/EmptyState';
import { Avatar } from '../components/ui/Avatar';
import { formatRelativeTime } from '../lib/utils';
import type { StaffMember } from '../lib/types';

const STATUS_VARIANTS: Record<string, 'success' | 'default' | 'warning'> = {
  active: 'success',
  inactive: 'default',
  pending: 'warning',
};

export function StaffPage() {
  const { activeGuild } = useGuild();
  const guildId = activeGuild?.id ?? null;
  const { staff, loading, error, fetchStaff, refetch } = useStaff(guildId);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (guildId) fetchStaff();
  }, [guildId, fetchStaff]);

  const filtered = staff.filter((s) =>
    !search || s.user_id.includes(search) || s.staff_role.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = staff.filter((s) => s.status === 'active').length;

  const columns: Column<StaffMember>[] = [
    { key: 'user_id', label: 'User', render: (s) => (
      <div className="flex items-center gap-2">
        <Avatar userId={s.user_id} alt={s.user_id} size="sm" />
        <span>{s.user_id}</span>
      </div>
    )},
    { key: 'staff_role', label: 'Role', render: (s) => <Badge variant="info" size="sm">{s.staff_role}</Badge> },
    { key: 'status', label: 'Status', render: (s) => (
      <Badge variant={STATUS_VARIANTS[s.status] || 'default'} size="sm">{s.status}</Badge>
    )},
    { key: 'added_by', label: 'Added By', hideOnMobile: true, render: (s) => <span className="text-eltron-subtle">{s.added_by}</span> },
    { key: 'created_at', label: 'Added', render: (s) => <span className="text-eltron-subtle text-xs whitespace-nowrap">{formatRelativeTime(s.created_at)}</span> },
  ];

  if (!guildId) return <EmptyState title="No server selected" description="Select a server from the sidebar." icon="Members" />;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Staff" description="Manage staff members and permissions" icon="Members" />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <StatCard title="Total Staff" value={staff.length} icon="Members" />
        <StatCard title="Active" value={activeCount} icon="Check" color="text-eltron-success" />
      </div>

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by user or role..." />
      </div>

      {loading && <LoadingDisplay />}
      {!loading && error && <ErrorDisplay message={error} onRetry={refetch} />}
      {!loading && !error && (
        <div className="card">
          <DataTable columns={columns} data={filtered} keyExtractor={(s) => s.user_id} emptyIcon="Members" emptyTitle="No staff members" emptyDescription="No staff members found." />
        </div>
      )}
    </div>
  );
}
