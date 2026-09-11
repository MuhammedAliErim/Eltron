import { BaseRepository } from '../BaseRepository';
import { logError } from '../../utils/logger';
import { DatabaseQueryError } from '../../utils/errors';

export interface StatsChannelRow {
  id: number;
  guild_id: string;
  channel_id: string;
  stat_type: string;
  format: string;
  last_updated: string | null;
  created_at: string;
  updated_at: string;
}

export interface StatsChannelCreate {
  guild_id: string;
  channel_id: string;
  stat_type: string;
  format: string;
}

export interface StatsChannelUpdate {
  format?: string;
  last_updated?: string | null;
}

export class StatsChannelRepository extends BaseRepository {
  async getByGuild(guildId: string): Promise<StatsChannelRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('stats_channels')
        .select('*')
        .eq('guild_id', guildId);

      if (error) {
        logError(`Error fetching stats channels for guild ${guildId}`, error);
        throw new DatabaseQueryError('Failed to fetch stats channels');
      }

      return (data || []) as StatsChannelRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getByGuild for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to fetch stats channels');
    }
  }

  async getByChannel(channelId: string): Promise<StatsChannelRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('stats_channels')
        .select('*')
        .eq('channel_id', channelId)
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as StatsChannelRow;
    } catch (error) {
      if (error instanceof Error && 'code' in error) throw error;
      logError(`Error fetching stats channel for channel ${channelId}`, error);
      return null;
    }
  }

  async create(input: StatsChannelCreate): Promise<StatsChannelRow> {
    try {
      const { data, error } = await this.supabase
        .from('stats_channels')
        .insert(input)
        .select()
        .single();

      if (error) {
        logError(`Error creating stats channel for guild ${input.guild_id}`, error);
        throw new DatabaseQueryError(`Failed to create stats channel: ${error.message}`);
      }

      return data as StatsChannelRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in create for guild ${input.guild_id}`, error);
      throw new DatabaseQueryError('Failed to create stats channel');
    }
  }

  async update(id: number, updates: StatsChannelUpdate): Promise<StatsChannelRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('stats_channels')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) {
        logError(`Error updating stats channel ${id}`, error);
        throw new DatabaseQueryError(`Failed to update stats channel: ${error.message}`);
      }

      return data as StatsChannelRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in update for stats channel ${id}`, error);
      throw new DatabaseQueryError('Failed to update stats channel');
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('stats_channels')
        .delete()
        .eq('id', id)
        .select('id');

      if (error) {
        logError(`Error deleting stats channel ${id}`, error);
        throw new DatabaseQueryError(`Failed to delete stats channel: ${error.message}`);
      }

      return (data || []).length > 0;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in delete for stats channel ${id}`, error);
      throw new DatabaseQueryError('Failed to delete stats channel');
    }
  }
}
