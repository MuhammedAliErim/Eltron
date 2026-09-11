import { BaseRepository } from '../BaseRepository';
import { logError } from '../../utils/logger';
import { DatabaseQueryError } from '../../utils/errors';

export interface CountingConfig {
  id: string;
  guild_id: string;
  channel_id: string;
  current_number: number;
  highest_number: number;
  last_user_id: string | null;
  enabled: boolean;
  reset_on_fail: boolean;
  created_at: string;
  updated_at: string;
}

export interface CountingScore {
  id: string;
  guild_id: string;
  user_id: string;
  correct_count: number;
  streak: number;
  best_streak: number;
  last_number: number | null;
  created_at: string;
  updated_at: string;
}

export interface CountingConfigUpdate {
  enabled?: boolean;
  reset_on_fail?: boolean;
  current_number?: number;
  highest_number?: number;
  last_user_id?: string | null;
}

export interface CountingScoreUpdate {
  correct_count?: number;
  streak?: number;
  best_streak?: number;
  last_number?: number | null;
}

export class CountingRepository extends BaseRepository {
  async getConfig(guildId: string): Promise<CountingConfig | null> {
    try {
      const { data, error } = await this.supabase
        .from('counting_configs')
        .select('*')
        .eq('guild_id', guildId)
        .eq('enabled', true)
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as CountingConfig;
    } catch (error) {
      if (error instanceof Error && 'code' in error) throw error;
      logError(`Error fetching counting config for guild ${guildId}`, error);
      return null;
    }
  }

  async getConfigByChannel(channelId: string): Promise<CountingConfig | null> {
    try {
      const { data, error } = await this.supabase
        .from('counting_configs')
        .select('*')
        .eq('channel_id', channelId)
        .eq('enabled', true)
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as CountingConfig;
    } catch (error) {
      if (error instanceof Error && 'code' in error) throw error;
      logError(`Error fetching counting config for channel ${channelId}`, error);
      return null;
    }
  }

  async createConfig(guildId: string, channelId: string): Promise<CountingConfig> {
    try {
      const { data, error } = await this.supabase
        .from('counting_configs')
        .insert({
          guild_id: guildId,
          channel_id: channelId,
        })
        .select()
        .single();

      if (error) {
        logError(`Error creating counting config for guild ${guildId}`, error);
        throw new DatabaseQueryError(`Failed to create counting config: ${error.message}`);
      }

      return data as CountingConfig;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in createConfig for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to create counting config');
    }
  }

  async updateConfig(guildId: string, updates: CountingConfigUpdate): Promise<CountingConfig | null> {
    try {
      const { data, error } = await this.supabase
        .from('counting_configs')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('guild_id', guildId)
        .select()
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) {
        logError(`Error updating counting config for guild ${guildId}`, error);
        throw new DatabaseQueryError(`Failed to update counting config: ${error.message}`);
      }

      return data as CountingConfig;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in updateConfig for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to update counting config');
    }
  }

  async getScores(guildId: string, page = 1, limit = 10): Promise<CountingScore[]> {
    try {
      const offset = (page - 1) * limit;
      const { data, error } = await this.supabase
        .from('counting_scores')
        .select('*')
        .eq('guild_id', guildId)
        .order('correct_count', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logError(`Error fetching counting scores for guild ${guildId}`, error);
        throw new DatabaseQueryError('Failed to fetch counting scores');
      }

      return (data || []) as CountingScore[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getScores for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to fetch counting scores');
    }
  }

  async getScore(guildId: string, userId: string): Promise<CountingScore | null> {
    try {
      const { data, error } = await this.supabase
        .from('counting_scores')
        .select('*')
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as CountingScore;
    } catch (error) {
      if (error instanceof Error && 'code' in error) throw error;
      logError(`Error fetching counting score for user ${userId}`, error);
      return null;
    }
  }

  async updateScore(guildId: string, userId: string, updates: CountingScoreUpdate): Promise<CountingScore> {
    try {
      const existing = await this.getScore(guildId, userId);

      if (!existing) {
        const { data, error } = await this.supabase
          .from('counting_scores')
          .insert({
            guild_id: guildId,
            user_id: userId,
            ...updates,
          })
          .select()
          .single();

        if (error) {
          logError(`Error creating counting score for user ${userId}`, error);
          throw new DatabaseQueryError(`Failed to create counting score: ${error.message}`);
        }

        return data as CountingScore;
      }

      const { data, error } = await this.supabase
        .from('counting_scores')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        logError(`Error updating counting score for user ${userId}`, error);
        throw new DatabaseQueryError(`Failed to update counting score: ${error.message}`);
      }

      return data as CountingScore;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in updateScore for user ${userId}`, error);
      throw new DatabaseQueryError('Failed to update counting score');
    }
  }
}
