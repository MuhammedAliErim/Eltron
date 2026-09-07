import { BaseRepository } from '../BaseRepository';
import { AnalyticsDailyRow, AnalyticsSummary } from '../schema';
import { logError } from '../../utils/logger';
import { DatabaseQueryError } from '../../utils/errors';

const METRIC_FIELDS = [
  'messages_total', 'messages_deleted',
  'members_joined', 'members_left',
  'moderation_actions', 'warnings', 'timeouts', 'kicks', 'bans',
  'automod_actions', 'spam_detections', 'raid_detections', 'verification_events', 'quarantine_events',
  'tickets_created', 'tickets_closed',
  'applications_submitted', 'applications_approved', 'applications_rejected',
  'giveaways_created', 'giveaway_entries', 'events_created', 'event_participants',
  'polls_created', 'poll_votes', 'reminders_created',
  'xp_awarded',
] as const;

type MetricName = typeof METRIC_FIELDS[number];

export class AnalyticsRepository extends BaseRepository {
  async upsertDaily(guildId: string, date: string, metrics: Partial<Record<MetricName, number>>): Promise<void> {
    try {
      const insertData: Record<string, unknown> = {
        guild_id: guildId,
        date,
      };

      for (const [key, value] of Object.entries(metrics)) {
        insertData[key] = value;
      }

      const { error } = await this.supabase
        .from('guild_analytics_daily')
        .upsert(insertData, {
          onConflict: 'guild_id,date',
          ignoreDuplicates: false,
        });

      if (error) {
        logError(`Error upserting analytics for guild ${guildId}`, error);
        throw new DatabaseQueryError(`Failed to upsert analytics: ${error.message}`);
      }
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in upsertDaily for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to upsert analytics');
    }
  }

  async incrementMetric(guildId: string, date: string, metric: MetricName, amount: number = 1): Promise<void> {
    try {
      const { error } = await this.supabase
        .rpc('increment_analytics_metric', {
          p_guild_id: guildId,
          p_date: date,
          p_metric: metric,
          p_increment: amount,
        });

      if (error) {
        logError(`Error incrementing analytics metric ${metric} for guild ${guildId}`, error);
        throw new DatabaseQueryError(`Failed to increment metric: ${error.message}`);
      }
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in incrementMetric for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to increment metric');
    }
  }

  async getDaily(guildId: string, date: string): Promise<AnalyticsDailyRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('guild_analytics_daily')
        .select('*')
        .eq('guild_id', guildId)
        .eq('date', date)
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as AnalyticsDailyRow;
    } catch (error) {
      if (error instanceof Error && 'code' in error) throw error;
      logError(`Error fetching daily analytics for guild ${guildId}`, error);
      throw new DatabaseQueryError(`Failed to fetch daily analytics`);
    }
  }

  async getRange(guildId: string, fromDate: string, toDate: string): Promise<AnalyticsDailyRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('guild_analytics_daily')
        .select('*')
        .eq('guild_id', guildId)
        .gte('date', fromDate)
        .lte('date', toDate)
        .order('date', { ascending: true });

      if (error) {
        logError(`Error fetching analytics range for guild ${guildId}`, error);
        throw new DatabaseQueryError('Failed to fetch analytics range');
      }

      return (data || []) as AnalyticsDailyRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getRange for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to fetch analytics range');
    }
  }

  async getSummary(guildId: string, fromDate: string, toDate: string): Promise<AnalyticsSummary> {
    const rows = await this.getRange(guildId, fromDate, toDate);

    const summary: AnalyticsSummary = {
      guild_id: guildId,
      from_date: fromDate,
      to_date: toDate,
      messages_total: 0,
      messages_deleted: 0,
      members_joined: 0,
      members_left: 0,
      moderation_actions: 0,
      warnings: 0,
      timeouts: 0,
      kicks: 0,
      bans: 0,
      automod_actions: 0,
      spam_detections: 0,
      raid_detections: 0,
      verification_events: 0,
      quarantine_events: 0,
      tickets_created: 0,
      tickets_closed: 0,
      applications_submitted: 0,
      applications_approved: 0,
      applications_rejected: 0,
      giveaways_created: 0,
      giveaway_entries: 0,
      events_created: 0,
      event_participants: 0,
      polls_created: 0,
      poll_votes: 0,
      reminders_created: 0,
      xp_awarded: 0,
    };

    for (const row of rows) {
      for (const field of METRIC_FIELDS) {
        summary[field] += row[field] || 0;
      }
    }

    return summary;
  }
}
