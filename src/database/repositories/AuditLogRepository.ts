import { BaseRepository } from '../BaseRepository';
import { logError } from '../../utils/logger';
import { DatabaseQueryError } from '../../utils/errors';

export interface AuditLogData {
  guild_id: string;
  action: string;
  moderator_id?: string;
  target_id?: string;
  target_type?: string;
  reason?: string;
  details?: Record<string, unknown>;
  channel_id?: string;
}

export interface AuditLogRow extends AuditLogData {
  id: string;
  created_at: string;
}

export interface GetLogsOptions {
  action?: string;
  moderatorId?: string;
  targetId?: string;
  page?: number;
  limit?: number;
}

export interface ModerationStatsRow {
  action: string;
  count: number;
}

export class AuditLogRepository extends BaseRepository {
  async log(data: AuditLogData): Promise<AuditLogRow> {
    try {
      const { data: created, error } = await this.supabase
        .from('audit_logs')
        .insert({
          guild_id: data.guild_id,
          action: data.action,
          moderator_id: data.moderator_id || null,
          target_id: data.target_id || null,
          target_type: data.target_type || null,
          reason: data.reason || null,
          details: data.details || {},
          channel_id: data.channel_id || null,
        })
        .select()
        .single();

      if (error) {
        logError('Failed to insert audit log', error);
        throw new DatabaseQueryError(`Failed to insert audit log: ${error.message}`);
      }

      return created as AuditLogRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError('Error in audit log insert', error);
      throw new DatabaseQueryError('Failed to insert audit log');
    }
  }

  async getLogs(guildId: string, options: GetLogsOptions = {}): Promise<{ data: AuditLogRow[]; total: number }> {
    try {
      const { action, moderatorId, targetId, page = 1, limit = 20 } = options;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let countQuery = this.supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('guild_id', guildId);

      let dataQuery = this.supabase
        .from('audit_logs')
        .select('*')
        .eq('guild_id', guildId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (action) {
        countQuery = countQuery.eq('action', action);
        dataQuery = dataQuery.eq('action', action);
      }
      if (moderatorId) {
        countQuery = countQuery.eq('moderator_id', moderatorId);
        dataQuery = dataQuery.eq('moderator_id', moderatorId);
      }
      if (targetId) {
        countQuery = countQuery.eq('target_id', targetId);
        dataQuery = dataQuery.eq('target_id', targetId);
      }

      const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

      if (countResult.error) throw countResult.error;
      if (dataResult.error) throw dataResult.error;

      return {
        data: (dataResult.data as AuditLogRow[]) || [],
        total: countResult.count ?? 0,
      };
    } catch (error) {
      logError(`Error fetching audit logs for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to fetch audit logs');
    }
  }

  async getLogById(id: string): Promise<AuditLogRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('audit_logs')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as AuditLogRow;
    } catch (error) {
      if (error instanceof Error && 'code' in error) throw error;
      logError(`Error fetching audit log ${id}`, error);
      throw new DatabaseQueryError(`Failed to fetch audit log ${id}`);
    }
  }

  async getRecentLogs(guildId: string, limit = 10): Promise<AuditLogRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('audit_logs')
        .select('*')
        .eq('guild_id', guildId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data as AuditLogRow[]) || [];
    } catch (error) {
      logError(`Error fetching recent audit logs for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to fetch recent audit logs');
    }
  }

  async getModerationStats(guildId: string, days = 30): Promise<ModerationStatsRow[]> {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await this.supabase
        .from('audit_logs')
        .select('action')
        .eq('guild_id', guildId)
        .gte('created_at', since);

      if (error) throw error;

      const counts = new Map<string, number>();
      for (const row of (data || []) as { action: string }[]) {
        counts.set(row.action, (counts.get(row.action) || 0) + 1);
      }

      const stats: ModerationStatsRow[] = [];
      for (const [action, count] of counts) {
        stats.push({ action, count });
      }

      return stats.sort((a, b) => b.count - a.count);
    } catch (error) {
      logError(`Error fetching moderation stats for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to fetch moderation stats');
    }
  }
}
