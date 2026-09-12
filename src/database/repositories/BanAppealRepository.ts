import { BaseRepository } from '../BaseRepository';
import { logError } from '../../utils/logger';
import { DatabaseQueryError } from '../../utils/errors';

export interface BanAppealData {
  guild_id: string;
  user_id: string;
  reason: string;
  status?: string;
  reviewer_id?: string;
  review_note?: string;
  reviewed_at?: string;
}

export interface BanAppealRow extends BanAppealData {
  id: string;
  created_at: string;
}

export interface GetBanAppealsOptions {
  status?: string;
  page?: number;
  limit?: number;
}

export class BanAppealRepository extends BaseRepository {
  async create(data: BanAppealData): Promise<BanAppealRow> {
    try {
      const { data: created, error } = await this.supabase
        .from('ban_appeals')
        .insert({
          guild_id: data.guild_id,
          user_id: data.user_id,
          reason: data.reason,
          status: data.status || 'pending',
        })
        .select()
        .single();

      if (error) {
        logError('Failed to insert ban appeal', error);
        throw new DatabaseQueryError(`Failed to insert ban appeal: ${error.message}`);
      }

      return created as BanAppealRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError('Error in ban appeal insert', error);
      throw new DatabaseQueryError('Failed to insert ban appeal');
    }
  }

  async getById(id: string): Promise<BanAppealRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('ban_appeals')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as BanAppealRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error fetching ban appeal ${id}`, error);
      throw new DatabaseQueryError(`Failed to fetch ban appeal ${id}`);
    }
  }

  async getByGuild(guildId: string, status?: string, page = 1, limit = 20): Promise<{ data: BanAppealRow[]; total: number }> {
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let countQuery = this.supabase
        .from('ban_appeals')
        .select('*', { count: 'exact', head: true })
        .eq('guild_id', guildId);

      let dataQuery = this.supabase
        .from('ban_appeals')
        .select('*')
        .eq('guild_id', guildId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (status) {
        countQuery = countQuery.eq('status', status);
        dataQuery = dataQuery.eq('status', status);
      }

      const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

      if (countResult.error) throw countResult.error;
      if (dataResult.error) throw dataResult.error;

      return {
        data: (dataResult.data as BanAppealRow[]) || [],
        total: countResult.count ?? 0,
      };
    } catch (error) {
      logError(`Error fetching ban appeals for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to fetch ban appeals');
    }
  }

  async getByUser(guildId: string, userId: string): Promise<BanAppealRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('ban_appeals')
        .select('*')
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data as BanAppealRow[]) || [];
    } catch (error) {
      logError(`Error fetching ban appeals for user ${userId} in guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to fetch ban appeals');
    }
  }

  async review(id: string, reviewerId: string, status: string, note?: string): Promise<BanAppealRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('ban_appeals')
        .update({
          status,
          reviewer_id: reviewerId,
          review_note: note || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) {
        logError('Failed to update ban appeal', error);
        throw new DatabaseQueryError(`Failed to update ban appeal: ${error.message}`);
      }

      return data as BanAppealRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error reviewing ban appeal ${id}`, error);
      throw new DatabaseQueryError('Failed to review ban appeal');
    }
  }

  async getPending(guildId: string): Promise<BanAppealRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('ban_appeals')
        .select('*')
        .eq('guild_id', guildId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data as BanAppealRow[]) || [];
    } catch (error) {
      logError(`Error fetching pending ban appeals for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to fetch pending ban appeals');
    }
  }
}
