import { BaseRepository } from '../BaseRepository';
import { logError } from '../../utils/logger';
import { DatabaseQueryError } from '../../utils/errors';

export interface TicketCategoryRow {
  id: string;
  guild_id: string;
  name: string;
  description: string;
  emoji: string;
  channel_id: string | null;
  auto_response: string;
  created_at: string;
}

export interface TicketCategoryCreate {
  guild_id: string;
  name: string;
  description?: string;
  emoji?: string;
  channel_id?: string;
  auto_response?: string;
}

export interface TicketCategoryUpdate {
  name?: string;
  description?: string;
  emoji?: string;
  channel_id?: string | null;
  auto_response?: string;
}

export class TicketCategoryRepository extends BaseRepository {
  async create(data: TicketCategoryCreate): Promise<TicketCategoryRow> {
    try {
      const { data: created, error } = await this.supabase
        .from('ticket_categories')
        .insert({
          guild_id: data.guild_id,
          name: data.name,
          description: data.description ?? '',
          emoji: data.emoji ?? '🎫',
          channel_id: data.channel_id ?? null,
          auto_response: data.auto_response ?? '',
        })
        .select()
        .single();

      if (error) {
        logError(`Error creating ticket category for guild ${data.guild_id}`, error);
        throw new DatabaseQueryError(`Failed to create ticket category: ${error.message}`);
      }

      return created as TicketCategoryRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in create ticket category for guild ${data.guild_id}`, error);
      throw new DatabaseQueryError('Failed to create ticket category');
    }
  }

  async getById(id: string): Promise<TicketCategoryRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('ticket_categories')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as TicketCategoryRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error fetching ticket category ${id}`, error);
      throw new DatabaseQueryError(`Failed to fetch ticket category ${id}`);
    }
  }

  async getByGuild(guildId: string): Promise<TicketCategoryRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('ticket_categories')
        .select('*')
        .eq('guild_id', guildId)
        .order('name', { ascending: true });

      if (error) throw error;

      return (data as TicketCategoryRow[]) || [];
    } catch (error) {
      if (this.isTableMissingError(error)) return this.handleTableError(error, `ticket categories for guild ${guildId}`) as unknown as TicketCategoryRow[];
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error fetching ticket categories for guild ${guildId}`, error);
      throw new DatabaseQueryError(`Failed to fetch ticket categories for guild ${guildId}`);
    }
  }

  async update(id: string, updates: TicketCategoryUpdate): Promise<TicketCategoryRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('ticket_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as TicketCategoryRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error updating ticket category ${id}`, error);
      throw new DatabaseQueryError(`Failed to update ticket category ${id}`);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const { error, count } = await this.supabase
        .from('ticket_categories')
        .delete()
        .eq('id', id);

      if (error) {
        logError(`Error deleting ticket category ${id}`, error);
        throw new DatabaseQueryError(`Failed to delete ticket category: ${error.message}`);
      }

      return (count ?? 0) > 0;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error deleting ticket category ${id}`, error);
      throw new DatabaseQueryError(`Failed to delete ticket category ${id}`);
    }
  }
}
