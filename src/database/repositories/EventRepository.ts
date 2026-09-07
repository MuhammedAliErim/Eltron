import { BaseRepository } from '../BaseRepository';
import {
  EventRow,
  EventCreate,
  EventUpdate,
  EventParticipantRow,
  EventParticipantCreate,
  EventWinnerRow,
  EventWinnerCreate,
} from '../schema';
import { logError } from '../../utils/logger';
import { DatabaseQueryError } from '../../utils/errors';

export class EventRepository extends BaseRepository {
  async createEvent(data: EventCreate): Promise<EventRow> {
    try {
      const { data: created, error } = await this.supabase
        .from('events')
        .insert({
          guild_id: data.guild_id,
          channel_id: data.channel_id,
          message_id: data.message_id || null,
          creator_id: data.creator_id,
          title: data.title,
          description: data.description || '',
          event_type: data.event_type,
          status: 'UPCOMING',
          starts_at: data.starts_at,
          ends_at: data.ends_at || null,
          max_participants: data.max_participants || null,
        })
        .select()
        .single();

      if (error) {
        logError(`Error creating event for guild ${data.guild_id}`, error);
        throw new DatabaseQueryError(`Failed to create event: ${error.message}`);
      }

      return created as EventRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in createEvent for guild ${data.guild_id}`, error);
      throw new DatabaseQueryError('Failed to create event');
    }
  }

  async getEvent(eventId: number): Promise<EventRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as EventRow;
    } catch (error) {
      if (error instanceof Error && 'code' in error) throw error;
      logError(`Error fetching event ${eventId}`, error);
      throw new DatabaseQueryError(`Failed to fetch event ${eventId}`);
    }
  }

  async getEventsByGuild(
    guildId: string,
    status?: string,
    limit: number = 25
  ): Promise<EventRow[]> {
    try {
      let query = this.supabase
        .from('events')
        .select('*')
        .eq('guild_id', guildId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        logError(`Error listing events for guild ${guildId}`, error);
        throw new DatabaseQueryError(`Failed to list events`);
      }

      return (data || []) as EventRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getEventsByGuild for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to list events');
    }
  }

  async getActiveAndUpcomingEvents(): Promise<EventRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('events')
        .select('*')
        .in('status', ['UPCOMING', 'ACTIVE'])
        .order('starts_at', { ascending: true });

      if (error) {
        logError('Error fetching active/upcoming events', error);
        throw new DatabaseQueryError('Failed to fetch events');
      }

      return (data || []) as EventRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError('Error in getActiveAndUpcomingEvents', error);
      throw new DatabaseQueryError('Failed to fetch events');
    }
  }

  async updateEvent(
    eventId: number,
    updates: EventUpdate
  ): Promise<EventRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('events')
        .update(updates)
        .eq('id', eventId)
        .select()
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) {
        logError(`Error updating event ${eventId}`, error);
        throw new DatabaseQueryError(`Failed to update event ${eventId}: ${error.message}`);
      }

      return data as EventRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in updateEvent ${eventId}`, error);
      throw new DatabaseQueryError(`Failed to update event ${eventId}`);
    }
  }

  async startEvent(eventId: number): Promise<EventRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('events')
        .update({ status: 'ACTIVE' })
        .eq('id', eventId)
        .eq('status', 'UPCOMING')
        .select()
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) {
        logError(`Error starting event ${eventId}`, error);
        throw new DatabaseQueryError(`Failed to start event ${eventId}`);
      }

      return data as EventRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in startEvent ${eventId}`, error);
      throw new DatabaseQueryError(`Failed to start event ${eventId}`);
    }
  }

  async endEvent(eventId: number): Promise<EventRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('events')
        .update({ status: 'ENDED' })
        .eq('id', eventId)
        .eq('status', 'ACTIVE')
        .select()
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) {
        logError(`Error ending event ${eventId}`, error);
        throw new DatabaseQueryError(`Failed to end event ${eventId}`);
      }

      return data as EventRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in endEvent ${eventId}`, error);
      throw new DatabaseQueryError(`Failed to end event ${eventId}`);
    }
  }

  async cancelEvent(eventId: number): Promise<EventRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('events')
        .update({ status: 'CANCELLED' })
        .eq('id', eventId)
        .in('status', ['UPCOMING', 'ACTIVE'])
        .select()
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) {
        logError(`Error cancelling event ${eventId}`, error);
        throw new DatabaseQueryError(`Failed to cancel event ${eventId}`);
      }

      return data as EventRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in cancelEvent ${eventId}`, error);
      throw new DatabaseQueryError(`Failed to cancel event ${eventId}`);
    }
  }

  async addParticipant(data: EventParticipantCreate): Promise<EventParticipantRow> {
    try {
      const { data: created, error } = await this.supabase
        .from('event_participants')
        .insert({
          event_id: data.event_id,
          guild_id: data.guild_id,
          user_id: data.user_id,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new DatabaseQueryError('ALREADY_JOINED');
        }
        logError(`Error adding event participant`, error);
        throw new DatabaseQueryError(`Failed to add event participant: ${error.message}`);
      }

      return created as EventParticipantRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in addParticipant`, error);
      throw new DatabaseQueryError('Failed to add event participant');
    }
  }

  async removeParticipant(eventId: number, userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('event_participants')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .select('id');

      if (error) {
        logError(`Error removing event participant`, error);
        throw new DatabaseQueryError(`Failed to remove event participant`);
      }

      return (data || []).length > 0;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in removeParticipant`, error);
      throw new DatabaseQueryError('Failed to remove event participant');
    }
  }

  async getParticipants(eventId: number): Promise<EventParticipantRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('event_participants')
        .select('*')
        .eq('event_id', eventId)
        .order('joined_at', { ascending: true });

      if (error) {
        logError(`Error fetching event participants for ${eventId}`, error);
        throw new DatabaseQueryError(`Failed to fetch event participants`);
      }

      return (data || []) as EventParticipantRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getParticipants for ${eventId}`, error);
      throw new DatabaseQueryError('Failed to fetch event participants');
    }
  }

  async countParticipants(eventId: number): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('event_participants')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId);

      if (error) {
        logError(`Error counting event participants for ${eventId}`, error);
        return 0;
      }

      return count || 0;
    } catch {
      return 0;
    }
  }

  async hasParticipant(eventId: number, userId: string): Promise<boolean> {
    try {
      const { count, error } = await this.supabase
        .from('event_participants')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('user_id', userId);

      if (error) return false;
      return (count || 0) > 0;
    } catch {
      return false;
    }
  }

  async addWinner(data: EventWinnerCreate): Promise<EventWinnerRow> {
    try {
      const { data: created, error } = await this.supabase
        .from('event_winners')
        .insert({
          event_id: data.event_id,
          guild_id: data.guild_id,
          user_id: data.user_id,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new DatabaseQueryError('ALREADY_WON');
        }
        logError(`Error creating event winner`, error);
        throw new DatabaseQueryError(`Failed to create event winner: ${error.message}`);
      }

      return created as EventWinnerRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in addWinner`, error);
      throw new DatabaseQueryError('Failed to create event winner');
    }
  }

  async getWinners(eventId: number): Promise<EventWinnerRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('event_winners')
        .select('*')
        .eq('event_id', eventId)
        .order('selected_at', { ascending: true });

      if (error) {
        logError(`Error fetching event winners for ${eventId}`, error);
        throw new DatabaseQueryError(`Failed to fetch event winners`);
      }

      return (data || []) as EventWinnerRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getWinners for ${eventId}`, error);
      throw new DatabaseQueryError('Failed to fetch event winners');
    }
  }

  async getWinnerUserIds(eventId: number): Promise<string[]> {
    try {
      const winners = await this.getWinners(eventId);
      return winners.map((w) => w.user_id);
    } catch {
      return [];
    }
  }

  async clearWinners(eventId: number): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('event_winners')
        .delete()
        .eq('event_id', eventId);

      if (error) {
        logError(`Error clearing event winners for ${eventId}`, error);
        throw new DatabaseQueryError(`Failed to clear event winners`);
      }
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in clearWinners`, error);
      throw new DatabaseQueryError('Failed to clear event winners');
    }
  }

  async getEligibleRerollCandidates(eventId: number): Promise<EventParticipantRow[]> {
    try {
      const winnerUserIds = await this.getWinnerUserIds(eventId);

      let query = this.supabase
        .from('event_participants')
        .select('*')
        .eq('event_id', eventId);

      if (winnerUserIds.length > 0) {
        query = query.not('user_id', 'in', `(${winnerUserIds.join(',')})`);
      }

      const { data, error } = await query;

      if (error) {
        logError(`Error fetching reroll candidates for event ${eventId}`, error);
        throw new DatabaseQueryError(`Failed to fetch reroll candidates`);
      }

      return (data || []) as EventParticipantRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getEligibleRerollCandidates for event ${eventId}`, error);
      throw new DatabaseQueryError('Failed to fetch reroll candidates');
    }
  }
}
