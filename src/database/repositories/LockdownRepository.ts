import { BaseRepository } from '../BaseRepository';
import { logError } from '../../utils/logger';
import { DatabaseQueryError } from '../../utils/errors';

export interface LockdownRow {
  id: string;
  guild_id: string;
  channel_id: string;
  locked_by: string;
  reason: string;
  auto_unlock_minutes: number;
  unlock_at: string | null;
  created_at: string;
}

export interface LockdownCreate {
  guild_id: string;
  channel_id: string;
  locked_by: string;
  reason?: string;
  auto_unlock_minutes?: number;
  unlock_at?: string | null;
}

export class LockdownRepository extends BaseRepository {
  async create(data: LockdownCreate): Promise<LockdownRow | null> {
    try {
      const { data: row, error } = await this.supabase
        .from('lockdowns')
        .insert({
          guild_id: data.guild_id,
          channel_id: data.channel_id,
          locked_by: data.locked_by,
          reason: data.reason ?? 'Server lockdown',
          auto_unlock_minutes: data.auto_unlock_minutes ?? 0,
          unlock_at: data.unlock_at ?? null,
        })
        .select()
        .single();

      if (error) {
        logError(`Failed to create lockdown for channel ${data.channel_id}`, error);
        throw new DatabaseQueryError(`Failed to create lockdown: ${error.message}`);
      }

      return row as LockdownRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in LockdownRepository.create`, error);
      throw new DatabaseQueryError('Failed to create lockdown record');
    }
  }

  async getByChannel(channelId: string): Promise<LockdownRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('lockdowns')
        .select('*')
        .eq('channel_id', channelId)
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) {
        logError(`Failed to fetch lockdown for channel ${channelId}`, error);
        throw new DatabaseQueryError(`Failed to fetch lockdown: ${error.message}`);
      }

      return data as LockdownRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in LockdownRepository.getByChannel`, error);
      throw new DatabaseQueryError(`Failed to fetch lockdown for channel ${channelId}`);
    }
  }

  async getByGuild(guildId: string): Promise<LockdownRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('lockdowns')
        .select('*')
        .eq('guild_id', guildId)
        .order('created_at', { ascending: false });

      if (error) {
        logError(`Failed to fetch lockdowns for guild ${guildId}`, error);
        throw new DatabaseQueryError(`Failed to fetch lockdowns: ${error.message}`);
      }

      return (data ?? []) as LockdownRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in LockdownRepository.getByGuild`, error);
      throw new DatabaseQueryError(`Failed to fetch lockdowns for guild ${guildId}`);
    }
  }

  async delete(channelId: string): Promise<boolean> {
    try {
      const { error, count } = await this.supabase
        .from('lockdowns')
        .delete()
        .eq('channel_id', channelId);

      if (error) {
        logError(`Failed to delete lockdown for channel ${channelId}`, error);
        throw new DatabaseQueryError(`Failed to delete lockdown: ${error.message}`);
      }

      return true;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in LockdownRepository.delete`, error);
      throw new DatabaseQueryError(`Failed to delete lockdown for channel ${channelId}`);
    }
  }

  async getExpired(): Promise<LockdownRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('lockdowns')
        .select('*')
        .not('unlock_at', 'is', null)
        .lte('unlock_at', new Date().toISOString());

      if (error) {
        logError('Failed to fetch expired lockdowns', error);
        throw new DatabaseQueryError(`Failed to fetch expired lockdowns: ${error.message}`);
      }

      return (data ?? []) as LockdownRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError('Error in LockdownRepository.getExpired', error);
      throw new DatabaseQueryError('Failed to fetch expired lockdowns');
    }
  }
}
