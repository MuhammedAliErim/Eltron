import { BaseRepository } from '../BaseRepository';
import {
  GiveawayRow,
  GiveawayCreate,
  GiveawayUpdate,
  GiveawayEntryRow,
  GiveawayEntryCreate,
  GiveawayWinnerRow,
  GiveawayWinnerCreate,
} from '../schema';
import { logError } from '../../utils/logger';
import { DatabaseQueryError } from '../../utils/errors';

export class GiveawayRepository extends BaseRepository {
  async createGiveaway(data: GiveawayCreate): Promise<GiveawayRow> {
    try {
      const { data: created, error } = await this.supabase
        .from('giveaways')
        .insert({
          guild_id: data.guild_id,
          channel_id: data.channel_id,
          message_id: data.message_id || null,
          host_id: data.host_id,
          prize: data.prize,
          description: data.description || '',
          winner_count: data.winner_count,
          ends_at: data.ends_at,
          status: 'ACTIVE',
          required_role_id: data.required_role_id || null,
          required_level: data.required_level ?? 0,
          max_entries: data.max_entries ?? 0,
        })
        .select()
        .single();

      if (error) {
        logError(`Error creating giveaway for guild ${data.guild_id}`, error);
        throw new DatabaseQueryError(`Failed to create giveaway: ${error.message}`);
      }

      return created as GiveawayRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in createGiveaway for guild ${data.guild_id}`, error);
      throw new DatabaseQueryError('Failed to create giveaway');
    }
  }

  async getGiveaway(giveawayId: number): Promise<GiveawayRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('giveaways')
        .select('*')
        .eq('id', giveawayId)
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as GiveawayRow;
    } catch (error) {
      if (error instanceof Error && 'code' in error) throw error;
      logError(`Error fetching giveaway ${giveawayId}`, error);
      throw new DatabaseQueryError(`Failed to fetch giveaway ${giveawayId}`);
    }
  }

  async getActiveGiveaways(guildId: string): Promise<GiveawayRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('giveaways')
        .select('*')
        .eq('guild_id', guildId)
        .eq('status', 'ACTIVE')
        .order('ends_at', { ascending: true });

      if (error) {
        logError(`Error fetching active giveaways for guild ${guildId}`, error);
        throw new DatabaseQueryError(`Failed to fetch active giveaways`);
      }

      return (data || []) as GiveawayRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getActiveGiveaways for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to fetch active giveaways');
    }
  }

  async getAllActiveGiveaways(): Promise<GiveawayRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('giveaways')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('ends_at', { ascending: true });

      if (error) {
        logError('Error fetching all active giveaways', error);
        throw new DatabaseQueryError('Failed to fetch all active giveaways');
      }

      return (data || []) as GiveawayRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError('Error in getAllActiveGiveaways', error);
      throw new DatabaseQueryError('Failed to fetch all active giveaways');
    }
  }

  async listGuildGiveaways(
    guildId: string,
    status?: string,
    limit: number = 25
  ): Promise<GiveawayRow[]> {
    try {
      let query = this.supabase
        .from('giveaways')
        .select('*')
        .eq('guild_id', guildId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        logError(`Error listing giveaways for guild ${guildId}`, error);
        throw new DatabaseQueryError(`Failed to list giveaways`);
      }

      return (data || []) as GiveawayRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in listGuildGiveaways for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to list giveaways');
    }
  }

  async updateGiveaway(
    giveawayId: number,
    updates: GiveawayUpdate
  ): Promise<GiveawayRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('giveaways')
        .update(updates)
        .eq('id', giveawayId)
        .select()
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) {
        logError(`Error updating giveaway ${giveawayId}`, error);
        throw new DatabaseQueryError(`Failed to update giveaway ${giveawayId}: ${error.message}`);
      }

      return data as GiveawayRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in updateGiveaway ${giveawayId}`, error);
      throw new DatabaseQueryError(`Failed to update giveaway ${giveawayId}`);
    }
  }

  async endGiveaway(giveawayId: number): Promise<GiveawayRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('giveaways')
        .update({ status: 'ENDED' })
        .eq('id', giveawayId)
        .eq('status', 'ACTIVE')
        .select()
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) {
        logError(`Error ending giveaway ${giveawayId}`, error);
        throw new DatabaseQueryError(`Failed to end giveaway ${giveawayId}`);
      }

      return data as GiveawayRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in endGiveaway ${giveawayId}`, error);
      throw new DatabaseQueryError(`Failed to end giveaway ${giveawayId}`);
    }
  }

  async cancelGiveaway(giveawayId: number): Promise<GiveawayRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('giveaways')
        .update({ status: 'CANCELLED' })
        .eq('id', giveawayId)
        .eq('status', 'ACTIVE')
        .select()
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) {
        logError(`Error cancelling giveaway ${giveawayId}`, error);
        throw new DatabaseQueryError(`Failed to cancel giveaway ${giveawayId}`);
      }

      return data as GiveawayRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in cancelGiveaway ${giveawayId}`, error);
      throw new DatabaseQueryError(`Failed to cancel giveaway ${giveawayId}`);
    }
  }

  async addEntry(data: GiveawayEntryCreate): Promise<GiveawayEntryRow> {
    try {
      const { data: created, error } = await this.supabase
        .from('giveaway_entries')
        .insert({
          giveaway_id: data.giveaway_id,
          guild_id: data.guild_id,
          user_id: data.user_id,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new DatabaseQueryError('ALREADY_JOINED');
        }
        logError(`Error adding giveaway entry`, error);
        throw new DatabaseQueryError(`Failed to add giveaway entry: ${error.message}`);
      }

      return created as GiveawayEntryRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in addEntry`, error);
      throw new DatabaseQueryError('Failed to add giveaway entry');
    }
  }

  async removeEntry(giveawayId: number, userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('giveaway_entries')
        .delete()
        .eq('giveaway_id', giveawayId)
        .eq('user_id', userId)
        .select('id');

      if (error) {
        logError(`Error removing giveaway entry`, error);
        throw new DatabaseQueryError(`Failed to remove giveaway entry`);
      }

      return (data || []).length > 0;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in removeEntry`, error);
      throw new DatabaseQueryError('Failed to remove giveaway entry');
    }
  }

  async getEntries(giveawayId: number): Promise<GiveawayEntryRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('giveaway_entries')
        .select('*')
        .eq('giveaway_id', giveawayId)
        .order('joined_at', { ascending: true });

      if (error) {
        logError(`Error fetching giveaway entries for ${giveawayId}`, error);
        throw new DatabaseQueryError(`Failed to fetch giveaway entries`);
      }

      return (data || []) as GiveawayEntryRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getEntries for ${giveawayId}`, error);
      throw new DatabaseQueryError('Failed to fetch giveaway entries');
    }
  }

  async countEntries(giveawayId: number): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('giveaway_entries')
        .select('id', { count: 'exact', head: true })
        .eq('giveaway_id', giveawayId);

      if (error) {
        logError(`Error counting giveaway entries for ${giveawayId}`, error);
        return 0;
      }

      return count || 0;
    } catch {
      return 0;
    }
  }

  async hasEntry(giveawayId: number, userId: string): Promise<boolean> {
    try {
      const { count, error } = await this.supabase
        .from('giveaway_entries')
        .select('id', { count: 'exact', head: true })
        .eq('giveaway_id', giveawayId)
        .eq('user_id', userId);

      if (error) return false;
      return (count || 0) > 0;
    } catch {
      return false;
    }
  }

  async createWinner(data: GiveawayWinnerCreate): Promise<GiveawayWinnerRow> {
    try {
      const { data: created, error } = await this.supabase
        .from('giveaway_winners')
        .insert({
          giveaway_id: data.giveaway_id,
          guild_id: data.guild_id,
          user_id: data.user_id,
          reroll_number: data.reroll_number || 0,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new DatabaseQueryError('ALREADY_WON');
        }
        logError(`Error creating giveaway winner`, error);
        throw new DatabaseQueryError(`Failed to create giveaway winner: ${error.message}`);
      }

      return created as GiveawayWinnerRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in createWinner`, error);
      throw new DatabaseQueryError('Failed to create giveaway winner');
    }
  }

  async getWinners(giveawayId: number): Promise<GiveawayWinnerRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('giveaway_winners')
        .select('*')
        .eq('giveaway_id', giveawayId)
        .order('selected_at', { ascending: true });

      if (error) {
        logError(`Error fetching giveaway winners for ${giveawayId}`, error);
        throw new DatabaseQueryError(`Failed to fetch giveaway winners`);
      }

      return (data || []) as GiveawayWinnerRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getWinners for ${giveawayId}`, error);
      throw new DatabaseQueryError('Failed to fetch giveaway winners');
    }
  }

  async getWinnerUserIds(giveawayId: number): Promise<string[]> {
    try {
      const winners = await this.getWinners(giveawayId);
      return winners.map((w) => w.user_id);
    } catch {
      return [];
    }
  }

  async getEligibleRerollCandidates(
    giveawayId: number
  ): Promise<GiveawayEntryRow[]> {
    try {
      const winnerUserIds = await this.getWinnerUserIds(giveawayId);

      let query = this.supabase
        .from('giveaway_entries')
        .select('*')
        .eq('giveaway_id', giveawayId);

      if (winnerUserIds.length > 0) {
        query = query.not('user_id', 'in', `(${winnerUserIds.join(',')})`);
      }

      const { data, error } = await query;

      if (error) {
        logError(`Error fetching reroll candidates for ${giveawayId}`, error);
        throw new DatabaseQueryError(`Failed to fetch reroll candidates`);
      }

      return (data || []) as GiveawayEntryRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getEligibleRerollCandidates for ${giveawayId}`, error);
      throw new DatabaseQueryError('Failed to fetch reroll candidates');
    }
  }
}
