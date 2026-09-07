import { BaseRepository } from '../BaseRepository';
import { ModerationCaseRow, ModerationCaseCreate, ModerationCaseRevoke } from '../schema';
import { logError } from '../../utils/logger';
import { DatabaseQueryError } from '../../utils/errors';

export class ModerationCaseRepository extends BaseRepository {
  async createCase(data: ModerationCaseCreate): Promise<ModerationCaseRow> {
    try {
      const { data: nextVal, error: seqError } = await this.supabase
        .rpc('get_next_case_number', { p_guild_id: data.guild_id });

      if (seqError) {
        logError('RPC get_next_case_number failed, cannot create case safely', seqError);
        throw new DatabaseQueryError('Failed to generate case number. Please try again.');
      }

      const { data: created, error: createError } = await this.supabase
        .from('moderation_cases')
        .insert({
          case_id: nextVal,
          guild_id: data.guild_id,
          user_id: data.user_id,
          moderator_id: data.moderator_id,
          type: data.type,
          reason: data.reason,
          duration: data.duration || null,
          expires_at: data.expires_at || null,
          active: true,
          metadata: data.metadata || {},
        })
        .select()
        .single();

      if (createError) {
        logError('Failed to create moderation case', createError);
        throw new DatabaseQueryError(`Failed to create case: ${createError.message}`);
      }

      return created as ModerationCaseRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError('Error in createCase', error);
      throw new DatabaseQueryError('Failed to create moderation case');
    }
  }

  async getCase(guildId: string, caseId: number): Promise<ModerationCaseRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('moderation_cases')
        .select('*')
        .eq('guild_id', guildId)
        .eq('case_id', caseId)
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as ModerationCaseRow;
    } catch (error) {
      if (error instanceof Error && 'code' in error) throw error;
      logError(`Error fetching case ${caseId} for guild ${guildId}`, error);
      throw new DatabaseQueryError(`Failed to fetch case ${caseId}`);
    }
  }

  async getActiveWarnings(guildId: string, userId: string): Promise<ModerationCaseRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('moderation_cases')
        .select('*')
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .eq('type', 'WARN')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data as ModerationCaseRow[]) || [];
    } catch (error) {
      logError(`Error fetching warnings for ${userId} in guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to fetch warnings');
    }
  }

  async revokeCase(
    guildId: string,
    caseId: number,
    revoke: ModerationCaseRevoke & { type?: string }
  ): Promise<ModerationCaseRow | null> {
    try {
      let query = this.supabase
        .from('moderation_cases')
        .update({
          active: false,
          revoked_by: revoke.revoked_by,
          revoked_at: new Date().toISOString(),
          revoked_reason: revoke.revoked_reason,
        })
        .eq('guild_id', guildId)
        .eq('case_id', caseId)
        .eq('active', true);

      if (revoke.type) {
        query = query.eq('type', revoke.type);
      }

      const { data, error } = await query.select().single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as ModerationCaseRow;
    } catch (error) {
      if (error instanceof Error && 'code' in error) throw error;
      logError(`Error revoking case ${caseId} in guild ${guildId}`, error);
      throw new DatabaseQueryError(`Failed to revoke case ${caseId}`);
    }
  }

  async getCases(
    guildId: string,
    options: { page?: number; pageSize?: number; type?: string; userId?: string } = {}
  ): Promise<{ data: ModerationCaseRow[]; total: number }> {
    try {
      const { page = 1, pageSize = 25, type, userId } = options;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let countQuery = this.supabase
        .from('moderation_cases')
        .select('*', { count: 'exact', head: true })
        .eq('guild_id', guildId);

      let dataQuery = this.supabase
        .from('moderation_cases')
        .select('*')
        .eq('guild_id', guildId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (type) {
        countQuery = countQuery.eq('type', type);
        dataQuery = dataQuery.eq('type', type);
      }
      if (userId) {
        countQuery = countQuery.eq('user_id', userId);
        dataQuery = dataQuery.eq('user_id', userId);
      }

      const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

      if (countResult.error) throw countResult.error;
      if (dataResult.error) throw dataResult.error;

      return {
        data: (dataResult.data as ModerationCaseRow[]) || [],
        total: countResult.count ?? 0,
      };
    } catch (error) {
      logError(`Error fetching cases for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to fetch cases');
    }
  }

  async getRecentCases(guildId: string, limit = 10): Promise<ModerationCaseRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('moderation_cases')
        .select('*')
        .eq('guild_id', guildId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data as ModerationCaseRow[]) || [];
    } catch (error) {
      logError(`Error fetching recent cases for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to fetch recent cases');
    }
  }
}
