import { BaseRepository } from '../BaseRepository';
import { logError } from '../../utils/logger';
import { DatabaseQueryError } from '../../utils/errors';

export interface StarboardConfigData {
  guild_id: string;
  channel_id: string;
  emoji?: string;
  threshold?: number;
  self_star?: boolean;
  enabled?: boolean;
}

export interface StarboardConfigRow extends StarboardConfigData {
  id: string;
  created_at: string;
}

export interface StarboardEntryData {
  guild_id: string;
  original_channel_id: string;
  original_message_id: string;
  starboard_message_id?: string;
  author_id: string;
  content?: string;
  star_count?: number;
}

export interface StarboardEntryRow extends StarboardEntryData {
  id: string;
  created_at: string;
}

export class StarboardRepository extends BaseRepository {
  async getConfig(guildId: string): Promise<StarboardConfigRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('starboard_configs')
        .select('*')
        .eq('guild_id', guildId)
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as StarboardConfigRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error fetching starboard config for guild ${guildId}`, error);
      throw new DatabaseQueryError(`Failed to fetch starboard config`);
    }
  }

  async upsertConfig(data: StarboardConfigData): Promise<StarboardConfigRow> {
    try {
      const existing = await this.getConfig(data.guild_id);

      if (existing) {
        const { data: updated, error } = await this.supabase
          .from('starboard_configs')
          .update({
            channel_id: data.channel_id,
            emoji: data.emoji || existing.emoji,
            threshold: data.threshold !== undefined ? data.threshold : existing.threshold,
            self_star: data.self_star !== undefined ? data.self_star : existing.self_star,
            enabled: data.enabled !== undefined ? data.enabled : existing.enabled,
          })
          .eq('guild_id', data.guild_id)
          .select()
          .single();

        if (error) {
          logError('Failed to update starboard config', error);
          throw new DatabaseQueryError(`Failed to update starboard config: ${error.message}`);
        }

        return updated as StarboardConfigRow;
      }

      const { data: created, error } = await this.supabase
        .from('starboard_configs')
        .insert({
          guild_id: data.guild_id,
          channel_id: data.channel_id,
          emoji: data.emoji || '⭐',
          threshold: data.threshold || 5,
          self_star: data.self_star || false,
          enabled: data.enabled !== undefined ? data.enabled : true,
        })
        .select()
        .single();

      if (error) {
        logError('Failed to insert starboard config', error);
        throw new DatabaseQueryError(`Failed to insert starboard config: ${error.message}`);
      }

      return created as StarboardConfigRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError('Error in starboard config upsert', error);
      throw new DatabaseQueryError('Failed to upsert starboard config');
    }
  }

  async getEntry(messageId: string): Promise<StarboardEntryRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('starboard_entries')
        .select('*')
        .eq('original_message_id', messageId)
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as StarboardEntryRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error fetching starboard entry for message ${messageId}`, error);
      throw new DatabaseQueryError(`Failed to fetch starboard entry`);
    }
  }

  async upsertEntry(data: StarboardEntryData): Promise<StarboardEntryRow> {
    try {
      const existing = await this.getEntry(data.original_message_id);

      if (existing) {
        const { data: updated, error } = await this.supabase
          .from('starboard_entries')
          .update({
            starboard_message_id: data.starboard_message_id || existing.starboard_message_id,
            content: data.content !== undefined ? data.content : existing.content,
            star_count: data.star_count !== undefined ? data.star_count : existing.star_count,
          })
          .eq('original_message_id', data.original_message_id)
          .select()
          .single();

        if (error) {
          logError('Failed to update starboard entry', error);
          throw new DatabaseQueryError(`Failed to update starboard entry: ${error.message}`);
        }

        return updated as StarboardEntryRow;
      }

      const { data: created, error } = await this.supabase
        .from('starboard_entries')
        .insert({
          guild_id: data.guild_id,
          original_channel_id: data.original_channel_id,
          original_message_id: data.original_message_id,
          starboard_message_id: data.starboard_message_id || null,
          author_id: data.author_id,
          content: data.content || null,
          star_count: data.star_count || 0,
        })
        .select()
        .single();

      if (error) {
        logError('Failed to insert starboard entry', error);
        throw new DatabaseQueryError(`Failed to insert starboard entry: ${error.message}`);
      }

      return created as StarboardEntryRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError('Error in starboard entry upsert', error);
      throw new DatabaseQueryError('Failed to upsert starboard entry');
    }
  }

  async deleteEntry(messageId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('starboard_entries')
        .delete()
        .eq('original_message_id', messageId);

      if (error) {
        logError('Failed to delete starboard entry', error);
        throw new DatabaseQueryError(`Failed to delete starboard entry: ${error.message}`);
      }

      return true;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error deleting starboard entry for message ${messageId}`, error);
      throw new DatabaseQueryError('Failed to delete starboard entry');
    }
  }

  async getEntries(guildId: string, page = 1, limit = 20): Promise<{ data: StarboardEntryRow[]; total: number }> {
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const [countResult, dataResult] = await Promise.all([
        this.supabase
          .from('starboard_entries')
          .select('*', { count: 'exact', head: true })
          .eq('guild_id', guildId),
        this.supabase
          .from('starboard_entries')
          .select('*')
          .eq('guild_id', guildId)
          .order('star_count', { ascending: false })
          .range(from, to),
      ]);

      if (countResult.error) throw countResult.error;
      if (dataResult.error) throw dataResult.error;

      return {
        data: (dataResult.data as StarboardEntryRow[]) || [],
        total: countResult.count ?? 0,
      };
    } catch (error) {
      logError(`Error fetching starboard entries for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to fetch starboard entries');
    }
  }

  async getTopEntries(guildId: string, limit = 10): Promise<StarboardEntryRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('starboard_entries')
        .select('*')
        .eq('guild_id', guildId)
        .order('star_count', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data as StarboardEntryRow[]) || [];
    } catch (error) {
      logError(`Error fetching top starboard entries for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to fetch top starboard entries');
    }
  }
}
