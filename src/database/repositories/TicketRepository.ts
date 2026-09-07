import { BaseRepository } from '../BaseRepository';
import { TicketRow, TicketCreate, TicketUpdate } from '../schema';
import { logError } from '../../utils/logger';
import { DatabaseQueryError } from '../../utils/errors';

export class TicketRepository extends BaseRepository {
  async createTicket(data: TicketCreate): Promise<TicketRow> {
    try {
      const { data: created, error } = await this.supabase
        .from('tickets')
        .insert({
          guild_id: data.guild_id,
          channel_id: data.channel_id,
          creator_id: data.creator_id,
          category: data.category || 'general',
          subject: data.subject || '',
          status: 'OPEN',
        })
        .select()
        .single();

      if (error) {
        logError(`Error creating ticket for guild ${data.guild_id}`, error);
        throw new DatabaseQueryError(`Failed to create ticket: ${error.message}`);
      }

      return created as TicketRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in createTicket for guild ${data.guild_id}`, error);
      throw new DatabaseQueryError('Failed to create ticket');
    }
  }

  async getTicket(ticketId: number): Promise<TicketRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as TicketRow;
    } catch (error) {
      if (error instanceof Error && 'code' in error) throw error;
      logError(`Error fetching ticket ${ticketId}`, error);
      throw new DatabaseQueryError(`Failed to fetch ticket ${ticketId}`);
    }
  }

  async getTicketByChannel(channelId: string): Promise<TicketRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('tickets')
        .select('*')
        .eq('channel_id', channelId)
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as TicketRow;
    } catch (error) {
      if (error instanceof Error && 'code' in error) throw error;
      logError(`Error fetching ticket by channel ${channelId}`, error);
      throw new DatabaseQueryError(`Failed to fetch ticket by channel ${channelId}`);
    }
  }

  async getOpenTicketByUser(
    guildId: string,
    userId: string
  ): Promise<TicketRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('tickets')
        .select('*')
        .eq('guild_id', guildId)
        .eq('creator_id', userId)
        .in('status', ['OPEN', 'CLAIMED'])
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as TicketRow;
    } catch (error) {
      if (error instanceof Error && 'code' in error) throw error;
      logError(`Error fetching open ticket for user ${userId} in guild ${guildId}`, error);
      throw new DatabaseQueryError(`Failed to fetch open ticket for user ${userId}`);
    }
  }

  async listGuildTicketsPaginated(
    guildId: string,
    options: { page?: number; pageSize?: number; status?: string } = {}
  ): Promise<{ data: TicketRow[]; total: number }> {
    try {
      const { page = 1, pageSize = 25, status } = options;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let countQuery = this.supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('guild_id', guildId);

      let dataQuery = this.supabase
        .from('tickets')
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
        data: (dataResult.data || []) as TicketRow[],
        total: countResult.count ?? 0,
      };
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error paginating tickets for guild ${guildId}`, error);
      throw new DatabaseQueryError(`Failed to paginate tickets for guild ${guildId}`);
    }
  }

  async listGuildTickets(
    guildId: string,
    status?: string
  ): Promise<TicketRow[]> {
    try {
      let query = this.supabase
        .from('tickets')
        .select('*')
        .eq('guild_id', guildId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        logError(`Error listing tickets for guild ${guildId}`, error);
        throw new DatabaseQueryError(`Failed to list tickets for guild ${guildId}`);
      }

      return (data || []) as TicketRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in listGuildTickets for guild ${guildId}`, error);
      throw new DatabaseQueryError(`Failed to list tickets for guild ${guildId}`);
    }
  }

  async updateTicket(
    ticketId: number,
    updates: TicketUpdate
  ): Promise<TicketRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('tickets')
        .update(updates)
        .eq('id', ticketId)
        .select()
        .single();

      if (error) {
        logError(`Error updating ticket ${ticketId}`, error);
        throw new DatabaseQueryError(`Failed to update ticket ${ticketId}: ${error.message}`);
      }

      return data as TicketRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in updateTicket ${ticketId}`, error);
      throw new DatabaseQueryError(`Failed to update ticket ${ticketId}`);
    }
  }

  async claimTicket(
    ticketId: number,
    staffId: string
  ): Promise<TicketRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('tickets')
        .update({
          assigned_to: staffId,
          status: 'CLAIMED',
        })
        .eq('id', ticketId)
        .eq('status', 'OPEN')
        .select()
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) {
        logError(`Error claiming ticket ${ticketId}`, error);
        throw new DatabaseQueryError(`Failed to claim ticket ${ticketId}`);
      }

      return data as TicketRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in claimTicket ${ticketId}`, error);
      throw new DatabaseQueryError(`Failed to claim ticket ${ticketId}`);
    }
  }

  async unclaimTicket(ticketId: number): Promise<TicketRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('tickets')
        .update({
          assigned_to: null,
          status: 'OPEN',
        })
        .eq('id', ticketId)
        .eq('status', 'CLAIMED')
        .select()
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) {
        logError(`Error unclaiming ticket ${ticketId}`, error);
        throw new DatabaseQueryError(`Failed to unclaim ticket ${ticketId}`);
      }

      return data as TicketRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in unclaimTicket ${ticketId}`, error);
      throw new DatabaseQueryError(`Failed to unclaim ticket ${ticketId}`);
    }
  }

  async closeTicket(
    ticketId: number,
    closedBy: string
  ): Promise<TicketRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('tickets')
        .update({
          status: 'CLOSED',
          closed_at: new Date().toISOString(),
          closed_by: closedBy,
        })
        .eq('id', ticketId)
        .in('status', ['OPEN', 'CLAIMED'])
        .select()
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) {
        logError(`Error closing ticket ${ticketId}`, error);
        throw new DatabaseQueryError(`Failed to close ticket ${ticketId}`);
      }

      return data as TicketRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in closeTicket ${ticketId}`, error);
      throw new DatabaseQueryError(`Failed to close ticket ${ticketId}`);
    }
  }

  async reopenTicket(ticketId: number): Promise<TicketRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('tickets')
        .update({
          status: 'OPEN',
          closed_at: null,
          closed_by: null,
        })
        .eq('id', ticketId)
        .eq('status', 'CLOSED')
        .select()
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) {
        logError(`Error reopening ticket ${ticketId}`, error);
        throw new DatabaseQueryError(`Failed to reopen ticket ${ticketId}`);
      }

      return data as TicketRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in reopenTicket ${ticketId}`, error);
      throw new DatabaseQueryError(`Failed to reopen ticket ${ticketId}`);
    }
  }

  async countOpenTickets(guildId: string, userId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('guild_id', guildId)
        .eq('creator_id', userId)
        .in('status', ['OPEN', 'CLAIMED']);

      if (error) {
        logError(`Error counting open tickets for user ${userId}`, error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      logError(`Error in countOpenTickets for user ${userId}`, error);
      return 0;
    }
  }
}
