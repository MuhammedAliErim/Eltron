import { BaseRepository } from '../BaseRepository';
import { logError } from '../../utils/logger';
import { DatabaseQueryError } from '../../utils/errors';

export interface TagRow {
  id: string;
  guild_id: string;
  name: string;
  content: string;
  aliases: string[];
  use_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TagCreate {
  guild_id: string;
  name: string;
  content: string;
  aliases?: string[];
  created_by: string;
}

export interface TagUpdate {
  content?: string;
  aliases?: string[];
}

export class TagRepository extends BaseRepository {
  async create(data: TagCreate): Promise<TagRow> {
    try {
      const { data: created, error } = await this.supabase
        .from('tags')
        .insert({
          guild_id: data.guild_id,
          name: data.name.toLowerCase(),
          content: data.content,
          aliases: data.aliases ?? [],
          created_by: data.created_by,
        })
        .select()
        .single();

      if (error) {
        logError(`Error creating tag ${data.name}`, error);
        throw new DatabaseQueryError(`Failed to create tag: ${error.message}`);
      }

      return created as TagRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in create tag ${data.name}`, error);
      throw new DatabaseQueryError('Failed to create tag');
    }
  }

  async getByName(guildId: string, name: string): Promise<TagRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('tags')
        .select('*')
        .eq('guild_id', guildId)
        .eq('name', name.toLowerCase())
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as TagRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error fetching tag ${name}`, error);
      throw new DatabaseQueryError(`Failed to fetch tag ${name}`);
    }
  }

  async getByGuild(guildId: string): Promise<TagRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('tags')
        .select('*')
        .eq('guild_id', guildId)
        .order('name', { ascending: true });

      if (error) {
        logError(`Error fetching tags for guild ${guildId}`, error);
        throw new DatabaseQueryError('Failed to fetch guild tags');
      }

      return (data || []) as TagRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getByGuild for ${guildId}`, error);
      throw new DatabaseQueryError('Failed to fetch guild tags');
    }
  }

  async getByGuildPaginated(guildId: string, page: number, limit: number): Promise<{ tags: TagRow[]; total: number }> {
    try {
      const offset = (page - 1) * limit;

      const [countResult, dataResult] = await Promise.all([
        this.supabase
          .from('tags')
          .select('*', { count: 'exact', head: true })
          .eq('guild_id', guildId),
        this.supabase
          .from('tags')
          .select('*')
          .eq('guild_id', guildId)
          .order('name', { ascending: true })
          .range(offset, offset + limit - 1),
      ]);

      if (countResult.error) throw countResult.error;
      if (dataResult.error) throw dataResult.error;

      return {
        tags: (dataResult.data || []) as TagRow[],
        total: countResult.count ?? 0,
      };
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getByGuildPaginated for ${guildId}`, error);
      throw new DatabaseQueryError('Failed to fetch paginated tags');
    }
  }

  async update(id: string, data: TagUpdate): Promise<TagRow | null> {
    try {
      const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (data.content !== undefined) updatePayload.content = data.content;
      if (data.aliases !== undefined) updatePayload.aliases = data.aliases;

      const { data: updated, error } = await this.supabase
        .from('tags')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) {
        logError(`Error updating tag ${id}`, error);
        throw new DatabaseQueryError(`Failed to update tag: ${error.message}`);
      }

      return updated as TagRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in update tag ${id}`, error);
      throw new DatabaseQueryError('Failed to update tag');
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('tags')
        .delete()
        .eq('id', id)
        .select('id');

      if (error) {
        logError(`Error deleting tag ${id}`, error);
        throw new DatabaseQueryError(`Failed to delete tag: ${error.message}`);
      }

      return (data || []).length > 0;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in delete tag ${id}`, error);
      throw new DatabaseQueryError('Failed to delete tag');
    }
  }

  async incrementUses(id: string): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('increment_tag_uses', { tag_id: id });

      if (error) {
        const { data } = await this.supabase
          .from('tags')
          .select('use_count')
          .eq('id', id)
          .single();

        if (data) {
          await this.supabase
            .from('tags')
            .update({ use_count: (data as TagRow).use_count + 1 })
            .eq('id', id);
        }
      }
    } catch {
      try {
        const { data } = await this.supabase
          .from('tags')
          .select('use_count')
          .eq('id', id)
          .single();

        if (data) {
          await this.supabase
            .from('tags')
            .update({ use_count: (data as TagRow).use_count + 1 })
            .eq('id', id);
        }
      } catch {
        // silent fail
      }
    }
  }

  async search(guildId: string, query: string): Promise<TagRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('tags')
        .select('*')
        .eq('guild_id', guildId)
        .or(`name.ilike.%${query}%,content.ilike.%${query}%`)
        .order('use_count', { ascending: false })
        .limit(25);

      if (error) {
        logError(`Error searching tags for guild ${guildId}`, error);
        throw new DatabaseQueryError('Failed to search tags');
      }

      return (data || []) as TagRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in search for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to search tags');
    }
  }
}
