import { BaseRepository } from '../BaseRepository';
import { ModNoteRow, ModNoteCreate } from '../schema';
import { logError } from '../../utils/logger';
import { DatabaseQueryError } from '../../utils/errors';

export class ModNoteRepository extends BaseRepository {
  async add(data: ModNoteCreate): Promise<ModNoteRow> {
    try {
      const { data: created, error } = await this.supabase
        .from('mod_notes')
        .insert({
          guild_id: data.guild_id,
          user_id: data.user_id,
          moderator_id: data.moderator_id,
          note: data.note,
        })
        .select()
        .single();

      if (error) {
        logError(`Error adding mod note for user ${data.user_id}`, error);
        throw new DatabaseQueryError(`Failed to add mod note: ${error.message}`);
      }

      return created as ModNoteRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in add mod note`, error);
      throw new DatabaseQueryError('Failed to add mod note');
    }
  }

  async getByUser(guildId: string, userId: string): Promise<ModNoteRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('mod_notes')
        .select('*')
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        logError(`Error fetching mod notes for user ${userId}`, error);
        throw new DatabaseQueryError('Failed to fetch mod notes');
      }

      return (data || []) as ModNoteRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getByUser`, error);
      throw new DatabaseQueryError('Failed to fetch mod notes');
    }
  }

  async getAll(guildId: string, page: number = 1, limit: number = 20): Promise<{ data: ModNoteRow[]; total: number }> {
    try {
      const { count, error: countError } = await this.supabase
        .from('mod_notes')
        .select('id', { count: 'exact', head: true })
        .eq('guild_id', guildId);

      if (countError) {
        logError(`Error counting mod notes for guild ${guildId}`, countError);
        throw new DatabaseQueryError('Failed to count mod notes');
      }

      const { data, error } = await this.supabase
        .from('mod_notes')
        .select('*')
        .eq('guild_id', guildId)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) {
        logError(`Error fetching all mod notes for guild ${guildId}`, error);
        throw new DatabaseQueryError('Failed to fetch mod notes');
      }

      return { data: (data || []) as ModNoteRow[], total: count || 0 };
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getAll`, error);
      throw new DatabaseQueryError('Failed to fetch mod notes');
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('mod_notes')
        .delete()
        .eq('id', id)
        .select('id');

      if (error) {
        logError(`Error deleting mod note ${id}`, error);
        throw new DatabaseQueryError(`Failed to delete mod note`);
      }

      return (data || []).length > 0;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in delete`, error);
      throw new DatabaseQueryError('Failed to delete mod note');
    }
  }

  async getByMod(guildId: string, moderatorId: string): Promise<ModNoteRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('mod_notes')
        .select('*')
        .eq('guild_id', guildId)
        .eq('moderator_id', moderatorId)
        .order('created_at', { ascending: false });

      if (error) {
        logError(`Error fetching mod notes by moderator ${moderatorId}`, error);
        throw new DatabaseQueryError('Failed to fetch mod notes');
      }

      return (data || []) as ModNoteRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getByMod`, error);
      throw new DatabaseQueryError('Failed to fetch mod notes');
    }
  }
}
