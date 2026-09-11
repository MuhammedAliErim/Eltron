import { BaseRepository } from '../BaseRepository';
import { logError } from '../../utils/logger';
import { DatabaseQueryError } from '../../utils/errors';

export interface CustomCommandRow {
  id: string;
  guild_id: string;
  name: string;
  response: string;
  description: string;
  aliases: string[];
  enabled: boolean;
  use_count: number;
  cooldown_seconds: number;
  requires_permission: string | null;
  embed_color: string | null;
  dm_response: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CustomCommandCreate {
  guild_id: string;
  name: string;
  response: string;
  description?: string;
  aliases?: string[];
  cooldown_seconds?: number;
  requires_permission?: string;
  embed_color?: string;
  dm_response?: boolean;
  created_by: string;
}

export interface CustomCommandUpdate {
  response?: string;
  description?: string;
  aliases?: string[];
  enabled?: boolean;
  cooldown_seconds?: number;
  requires_permission?: string | null;
  embed_color?: string | null;
  dm_response?: boolean;
}

export class CustomCommandRepository extends BaseRepository {
  async create(data: CustomCommandCreate): Promise<CustomCommandRow> {
    try {
      const { data: created, error } = await this.supabase
        .from('custom_commands')
        .insert({
          guild_id: data.guild_id,
          name: data.name.toLowerCase(),
          response: data.response,
          description: data.description ?? '',
          aliases: data.aliases ?? [],
          cooldown_seconds: data.cooldown_seconds ?? 0,
          requires_permission: data.requires_permission ?? null,
          embed_color: data.embed_color ?? null,
          dm_response: data.dm_response ?? false,
          created_by: data.created_by,
        })
        .select()
        .single();

      if (error) {
        logError(`Error creating custom command ${data.name}`, error);
        throw new DatabaseQueryError(`Failed to create custom command: ${error.message}`);
      }

      return created as CustomCommandRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in create custom command ${data.name}`, error);
      throw new DatabaseQueryError('Failed to create custom command');
    }
  }

  async getByName(guildId: string, name: string): Promise<CustomCommandRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('custom_commands')
        .select('*')
        .eq('guild_id', guildId)
        .eq('name', name.toLowerCase())
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as CustomCommandRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error fetching custom command ${name}`, error);
      throw new DatabaseQueryError(`Failed to fetch custom command ${name}`);
    }
  }

  async getByGuild(guildId: string): Promise<CustomCommandRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('custom_commands')
        .select('*')
        .eq('guild_id', guildId)
        .order('name', { ascending: true });

      if (error) {
        logError(`Error fetching custom commands for guild ${guildId}`, error);
        throw new DatabaseQueryError('Failed to fetch guild custom commands');
      }

      return (data || []) as CustomCommandRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getByGuild for ${guildId}`, error);
      throw new DatabaseQueryError('Failed to fetch guild custom commands');
    }
  }

  async getEnabledByGuild(guildId: string): Promise<CustomCommandRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('custom_commands')
        .select('*')
        .eq('guild_id', guildId)
        .eq('enabled', true)
        .order('name', { ascending: true });

      if (error) {
        logError(`Error fetching enabled custom commands for guild ${guildId}`, error);
        throw new DatabaseQueryError('Failed to fetch enabled custom commands');
      }

      return (data || []) as CustomCommandRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getEnabledByGuild for ${guildId}`, error);
      throw new DatabaseQueryError('Failed to fetch enabled custom commands');
    }
  }

  async update(id: string, data: CustomCommandUpdate): Promise<CustomCommandRow | null> {
    try {
      const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (data.response !== undefined) updatePayload.response = data.response;
      if (data.description !== undefined) updatePayload.description = data.description;
      if (data.aliases !== undefined) updatePayload.aliases = data.aliases;
      if (data.enabled !== undefined) updatePayload.enabled = data.enabled;
      if (data.cooldown_seconds !== undefined) updatePayload.cooldown_seconds = data.cooldown_seconds;
      if (data.requires_permission !== undefined) updatePayload.requires_permission = data.requires_permission;
      if (data.embed_color !== undefined) updatePayload.embed_color = data.embed_color;
      if (data.dm_response !== undefined) updatePayload.dm_response = data.dm_response;

      const { data: updated, error } = await this.supabase
        .from('custom_commands')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) {
        logError(`Error updating custom command ${id}`, error);
        throw new DatabaseQueryError(`Failed to update custom command: ${error.message}`);
      }

      return updated as CustomCommandRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in update custom command ${id}`, error);
      throw new DatabaseQueryError('Failed to update custom command');
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('custom_commands')
        .delete()
        .eq('id', id)
        .select('id');

      if (error) {
        logError(`Error deleting custom command ${id}`, error);
        throw new DatabaseQueryError(`Failed to delete custom command: ${error.message}`);
      }

      return (data || []).length > 0;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in delete custom command ${id}`, error);
      throw new DatabaseQueryError('Failed to delete custom command');
    }
  }

  async incrementUses(id: string): Promise<void> {
    try {
      const { data } = await this.supabase
        .from('custom_commands')
        .select('use_count')
        .eq('id', id)
        .single();

      if (data) {
        await this.supabase
          .from('custom_commands')
          .update({ use_count: (data as CustomCommandRow).use_count + 1 })
          .eq('id', id);
      }
    } catch {
      try {
        const { data } = await this.supabase
          .from('custom_commands')
          .select('use_count')
          .eq('id', id)
          .single();

        if (data) {
          await this.supabase
            .from('custom_commands')
            .update({ use_count: (data as CustomCommandRow).use_count + 1 })
            .eq('id', id);
        }
      } catch {
        // silent fail
      }
    }
  }

  async search(guildId: string, query: string): Promise<CustomCommandRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('custom_commands')
        .select('*')
        .eq('guild_id', guildId)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .order('use_count', { ascending: false })
        .limit(25);

      if (error) {
        logError(`Error searching custom commands for guild ${guildId}`, error);
        throw new DatabaseQueryError('Failed to search custom commands');
      }

      return (data || []) as CustomCommandRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in search for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to search custom commands');
    }
  }
}
