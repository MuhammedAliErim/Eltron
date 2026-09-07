import { useState } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { useAnalytics } from '../hooks/useAnalytics';
import { PageHeader } from '../components/PageHeader';
import { PeriodSelector } from '../components/analytics/PeriodSelector';
import { AnalyticsSection } from '../components/analytics/AnalyticsSection';
import { StatCardSkeleton } from '../components/ui/Skeleton';
import { EmptyState, ErrorDisplay } from '../components/ui/EmptyState';
import type { AnalyticsPeriod } from '../lib/types';

export function AnalyticsPage() {
  const { activeGuild } = useGuild();
  const [period, setPeriod] = useState<AnalyticsPeriod>('weekly');
  const { analytics, loading, error, fetchWeekly, fetchMonthly, fetchRange } = useAnalytics(activeGuild?.id || null);

  const handlePeriodChange = (p: AnalyticsPeriod) => {
    setPeriod(p);
    if (p === 'weekly') fetchWeekly();
    else if (p === 'monthly') fetchMonthly();
    else if (p === 'quarterly') {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 90);
      fetchRange(from.toISOString().split('T')[0], to.toISOString().split('T')[0]);
    }
  };

  if (!activeGuild) {
    return (
      <EmptyState
        title="No Server Selected"
        description="Select a server from the sidebar to view analytics."
        icon="Analytics"
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Analytics" description={`Statistics for ${activeGuild.name}`} icon="Analytics" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={fetchWeekly} />;
  }

  const messageMetrics = [
    {
      label: 'Messages',
      value: analytics?.messages_total || 0,
      chartData: [],
      color: 'bg-eltron-accent',
    },
    {
      label: 'Members Joined',
      value: analytics?.members_joined || 0,
      chartData: [],
      color: 'bg-eltron-success',
    },
    {
      label: 'Members Left',
      value: analytics?.members_left || 0,
      chartData: [],
      color: 'bg-eltron-warning',
    },
    {
      label: 'Messages Deleted',
      value: analytics?.messages_deleted || 0,
      chartData: [],
      color: 'bg-eltron-danger',
    },
  ];

  const moderationMetrics = [
    {
      label: 'Moderation Actions',
      value: analytics?.moderation_actions || 0,
      chartData: [],
    },
    {
      label: 'Warnings',
      value: analytics?.warnings || 0,
      chartData: [],
    },
    {
      label: 'Kicks',
      value: analytics?.kicks || 0,
      chartData: [],
    },
    {
      label: 'Bans',
      value: analytics?.bans || 0,
      chartData: [],
    },
  ];

  const securityMetrics = [
    {
      label: 'AutoMod Actions',
      value: analytics?.automod_actions || 0,
      chartData: [],
    },
    {
      label: 'Spam Detections',
      value: analytics?.spam_detections || 0,
      chartData: [],
    },
    {
      label: 'Raid Detections',
      value: analytics?.raid_detections || 0,
      chartData: [],
    },
    {
      label: 'Verification Events',
      value: analytics?.verification_events || 0,
      chartData: [],
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader title="Analytics" description={`Statistics for ${activeGuild.name}`} icon="Analytics" />
        <PeriodSelector value={period} onChange={handlePeriodChange} />
      </div>

      <AnalyticsSection title="Messages & Members" metrics={messageMetrics} loading={loading} />
      <AnalyticsSection title="Moderation" metrics={moderationMetrics} loading={loading} />
      <AnalyticsSection title="Security" metrics={securityMetrics} loading={loading} />
    </div>
  );
}
