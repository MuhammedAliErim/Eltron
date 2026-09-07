import { BaseRepository } from '../BaseRepository';
import {
  PollRow,
  PollCreate,
  PollUpdate,
  PollOptionRow,
  PollOptionCreate,
  PollVoteRow,
  PollVoteCreate,
} from '../schema';
import { logError } from '../../utils/logger';
import { DatabaseQueryError } from '../../utils/errors';

export class PollRepository extends BaseRepository {
  async createPoll(data: PollCreate): Promise<PollRow> {
    try {
      const { data: created, error } = await this.supabase
        .from('polls')
        .insert({
          guild_id: data.guild_id,
          channel_id: data.channel_id,
          message_id: data.message_id || null,
          creator_id: data.creator_id,
          question: data.question,
          description: data.description || '',
          status: 'ACTIVE',
          multiple_choice: data.multiple_choice || false,
          anonymous: data.anonymous || false,
          ends_at: data.ends_at || null,
        })
        .select()
        .single();

      if (error) {
        logError(`Error creating poll for guild ${data.guild_id}`, error);
        throw new DatabaseQueryError(`Failed to create poll: ${error.message}`);
      }

      return created as PollRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in createPoll for guild ${data.guild_id}`, error);
      throw new DatabaseQueryError('Failed to create poll');
    }
  }

  async getPoll(pollId: number): Promise<PollRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('polls')
        .select('*')
        .eq('id', pollId)
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as PollRow;
    } catch (error) {
      if (error instanceof Error && 'code' in error) throw error;
      logError(`Error fetching poll ${pollId}`, error);
      throw new DatabaseQueryError(`Failed to fetch poll ${pollId}`);
    }
  }

  async getPollsByGuild(
    guildId: string,
    status?: string,
    limit: number = 25
  ): Promise<PollRow[]> {
    try {
      let query = this.supabase
        .from('polls')
        .select('*')
        .eq('guild_id', guildId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        logError(`Error listing polls for guild ${guildId}`, error);
        throw new DatabaseQueryError('Failed to list polls');
      }

      return (data || []) as PollRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getPollsByGuild for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to list polls');
    }
  }

  async getActivePolls(): Promise<PollRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('polls')
        .select('*')
        .eq('status', 'ACTIVE')
        .not('ends_at', 'is', null)
        .order('ends_at', { ascending: true });

      if (error) {
        logError('Error fetching active polls', error);
        throw new DatabaseQueryError('Failed to fetch active polls');
      }

      return (data || []) as PollRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError('Error in getActivePolls', error);
      throw new DatabaseQueryError('Failed to fetch active polls');
    }
  }

  async updatePoll(pollId: number, updates: PollUpdate): Promise<PollRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('polls')
        .update(updates)
        .eq('id', pollId)
        .select()
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) {
        logError(`Error updating poll ${pollId}`, error);
        throw new DatabaseQueryError(`Failed to update poll ${pollId}: ${error.message}`);
      }

      return data as PollRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in updatePoll ${pollId}`, error);
      throw new DatabaseQueryError(`Failed to update poll ${pollId}`);
    }
  }

  async endPoll(pollId: number): Promise<PollRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('polls')
        .update({ status: 'ENDED' })
        .eq('id', pollId)
        .eq('status', 'ACTIVE')
        .select()
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) {
        logError(`Error ending poll ${pollId}`, error);
        throw new DatabaseQueryError(`Failed to end poll ${pollId}`);
      }

      return data as PollRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in endPoll ${pollId}`, error);
      throw new DatabaseQueryError(`Failed to end poll ${pollId}`);
    }
  }

  async cancelPoll(pollId: number): Promise<PollRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('polls')
        .update({ status: 'CANCELLED' })
        .eq('id', pollId)
        .in('status', ['ACTIVE'])
        .select()
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) {
        logError(`Error cancelling poll ${pollId}`, error);
        throw new DatabaseQueryError(`Failed to cancel poll ${pollId}`);
      }

      return data as PollRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in cancelPoll ${pollId}`, error);
      throw new DatabaseQueryError(`Failed to cancel poll ${pollId}`);
    }
  }

  async getOptions(pollId: number): Promise<PollOptionRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('poll_options')
        .select('*')
        .eq('poll_id', pollId)
        .order('option_index', { ascending: true });

      if (error) {
        logError(`Error fetching poll options for ${pollId}`, error);
        throw new DatabaseQueryError('Failed to fetch poll options');
      }

      return (data || []) as PollOptionRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getOptions for ${pollId}`, error);
      throw new DatabaseQueryError('Failed to fetch poll options');
    }
  }

  async addOption(data: PollOptionCreate): Promise<PollOptionRow> {
    try {
      const { data: created, error } = await this.supabase
        .from('poll_options')
        .insert({
          poll_id: data.poll_id,
          guild_id: data.guild_id,
          option_index: data.option_index,
          option_text: data.option_text,
        })
        .select()
        .single();

      if (error) {
        logError('Error adding poll option', error);
        throw new DatabaseQueryError(`Failed to add poll option: ${error.message}`);
      }

      return created as PollOptionRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError('Error in addOption', error);
      throw new DatabaseQueryError('Failed to add poll option');
    }
  }

  async getVotes(pollId: number): Promise<PollVoteRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('poll_votes')
        .select('*')
        .eq('poll_id', pollId)
        .order('voted_at', { ascending: true });

      if (error) {
        logError(`Error fetching poll votes for ${pollId}`, error);
        throw new DatabaseQueryError('Failed to fetch poll votes');
      }

      return (data || []) as PollVoteRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getVotes for ${pollId}`, error);
      throw new DatabaseQueryError('Failed to fetch poll votes');
    }
  }

  async getUserVotes(pollId: number, userId: string): Promise<PollVoteRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('poll_votes')
        .select('*')
        .eq('poll_id', pollId)
        .eq('user_id', userId);

      if (error) {
        logError(`Error fetching user votes for poll ${pollId}`, error);
        throw new DatabaseQueryError('Failed to fetch user votes');
      }

      return (data || []) as PollVoteRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getUserVotes for ${pollId}`, error);
      throw new DatabaseQueryError('Failed to fetch user votes');
    }
  }

  async addVote(data: PollVoteCreate): Promise<PollVoteRow> {
    try {
      const { data: created, error } = await this.supabase
        .from('poll_votes')
        .insert({
          poll_id: data.poll_id,
          option_id: data.option_id,
          guild_id: data.guild_id,
          user_id: data.user_id,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new DatabaseQueryError('ALREADY_VOTED');
        }
        logError('Error adding poll vote', error);
        throw new DatabaseQueryError(`Failed to add poll vote: ${error.message}`);
      }

      return created as PollVoteRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError('Error in addVote', error);
      throw new DatabaseQueryError('Failed to add poll vote');
    }
  }

  async removeVote(pollId: number, optionId: number, userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('poll_votes')
        .delete()
        .eq('poll_id', pollId)
        .eq('option_id', optionId)
        .eq('user_id', userId)
        .select('id');

      if (error) {
        logError('Error removing poll vote', error);
        throw new DatabaseQueryError('Failed to remove poll vote');
      }

      return (data || []).length > 0;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError('Error in removeVote', error);
      throw new DatabaseQueryError('Failed to remove poll vote');
    }
  }

  async removeUserVotes(pollId: number, userId: string): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('poll_votes')
        .delete()
        .eq('poll_id', pollId)
        .eq('user_id', userId)
        .select('id');

      if (error) {
        logError('Error removing user votes', error);
        throw new DatabaseQueryError('Failed to remove user votes');
      }

      return (data || []).length;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError('Error in removeUserVotes', error);
      throw new DatabaseQueryError('Failed to remove user votes');
    }
  }

  async clearVotes(pollId: number): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('poll_votes')
        .delete()
        .eq('poll_id', pollId);

      if (error) {
        logError(`Error clearing poll votes for ${pollId}`, error);
        throw new DatabaseQueryError('Failed to clear poll votes');
      }
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in clearVotes for ${pollId}`, error);
      throw new DatabaseQueryError('Failed to clear poll votes');
    }
  }

  async countVotesForOption(optionId: number): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('poll_votes')
        .select('id', { count: 'exact', head: true })
        .eq('option_id', optionId);

      if (error) return 0;
      return count || 0;
    } catch {
      return 0;
    }
  }

  async hasVotedForOption(pollId: number, optionId: number, userId: string): Promise<boolean> {
    try {
      const { count, error } = await this.supabase
        .from('poll_votes')
        .select('id', { count: 'exact', head: true })
        .eq('poll_id', pollId)
        .eq('option_id', optionId)
        .eq('user_id', userId);

      if (error) return false;
      return (count || 0) > 0;
    } catch {
      return false;
    }
  }

  async getUserVoteForPoll(pollId: number, userId: string): Promise<PollVoteRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('poll_votes')
        .select('*')
        .eq('poll_id', pollId)
        .eq('user_id', userId);

      if (error) {
        logError(`Error fetching user vote for poll ${pollId}`, error);
        throw new DatabaseQueryError('Failed to fetch user vote');
      }

      return (data || []) as PollVoteRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getUserVoteForPoll for ${pollId}`, error);
      throw new DatabaseQueryError('Failed to fetch user vote');
    }
  }
}
