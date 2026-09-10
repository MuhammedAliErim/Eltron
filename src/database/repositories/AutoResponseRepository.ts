import { BaseRepository } from '../BaseRepository';
import { logError } from '../../utils/logger';
import { DatabaseQueryError } from '../../utils/errors';

export interface AutoResponseRow {
  id: string;
  guild_id: string;
  trigger_text: string;
  response_text: string;
  match_type: string;
  channel_ids: string[];
  excluded_channel_ids: string[];
  enabled: boolean;
  cooldown_seconds: number;
  last_used_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AutoResponseCreate {
  guild_id: string;
  trigger_text: string;
  response_text: string;
  match_type: string;
  channel_ids?: string[];
  excluded_channel_ids?: string[];
  cooldown_seconds?: number;
  created_by: string;
}

export interface AutoResponseUpdate {
  trigger_text?: string;
  response_text?: string;
  match_type?: string;
  channel_ids?: string[];
  excluded_channel_ids?: string[];
  enabled?: boolean;
  cooldown_seconds?: number;
}

export class AutoResponseRepository extends BaseRepository {
  async create(data: AutoResponseCreate): Promise<AutoResponseRow> {
    try {
      const { data: created, error } = await this.supabase
        .from('auto_responses')
        .insert({
          guild_id: data.guild_id,
          trigger_text: data.trigger_text,
          response_text: data.response_text,
          match_type: data.match_type,
          channel_ids: data.channel_ids ?? [],
          excluded_channel_ids: data.excluded_channel_ids ?? [],
          cooldown_seconds: data.cooldown_seconds ?? 0,
          created_by: data.created_by,
        })
        .select()
        .single();

      if (error) {
        logError('Failed to create auto response', error);
        throw new DatabaseQueryError(`Failed to create auto response: ${error.message}`);
      }

      return created as AutoResponseRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError('Error in create auto response', error);
      throw new DatabaseQueryError('Failed to create auto response');
    }
  }

  async getById(id: string): Promise<AutoResponseRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('auto_responses')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as AutoResponseRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error fetching auto response ${id}`, error);
      throw new DatabaseQueryError(`Failed to fetch auto response ${id}`);
    }
  }

  async getByGuild(guildId: string): Promise<AutoResponseRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('auto_responses')
        .select('*')
        .eq('guild_id', guildId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data as AutoResponseRow[]) || [];
    } catch (error) {
      if (this.isTableMissingError(error)) return this.handleTableError(error, `auto responses for guild ${guildId}`) as unknown as AutoResponseRow[];
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error fetching auto responses for guild ${guildId}`, error);
      throw new DatabaseQueryError(`Failed to fetch auto responses for guild ${guildId}`);
    }
  }

  async getEnabledByGuild(guildId: string): Promise<AutoResponseRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('auto_responses')
        .select('*')
        .eq('guild_id', guildId)
        .eq('enabled', true)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data as AutoResponseRow[]) || [];
    } catch (error) {
      if (this.isTableMissingError(error)) return this.handleTableError(error, `auto responses for guild ${guildId}`) as unknown as AutoResponseRow[];
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error fetching enabled auto responses for guild ${guildId}`, error);
      throw new DatabaseQueryError(`Failed to fetch enabled auto responses for guild ${guildId}`);
    }
  }

  async update(id: string, updates: AutoResponseUpdate): Promise<AutoResponseRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('auto_responses')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as AutoResponseRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error updating auto response ${id}`, error);
      throw new DatabaseQueryError(`Failed to update auto response ${id}`);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const { error, count } = await this.supabase
        .from('auto_responses')
        .delete()
        .eq('id', id);

      if (error) {
        logError(`Error deleting auto response ${id}`, error);
        throw new DatabaseQueryError(`Failed to delete auto response: ${error.message}`);
      }

      return (count ?? 0) > 0;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error deleting auto response ${id}`, error);
      throw new DatabaseQueryError(`Failed to delete auto response ${id}`);
    }
  }

  async incrementUses(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('auto_responses')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        logError(`Error incrementing uses for auto response ${id}`, error);
      }
    } catch (error) {
      logError(`Error incrementing uses for auto response ${id}`, error);
    }
  }
}
