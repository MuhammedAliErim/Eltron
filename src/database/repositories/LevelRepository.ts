import { BaseRepository } from '../BaseRepository';
import { UserXPRow, LeaderboardEntry } from '../schema';
import { logError } from '../../utils/logger';
import { DatabaseQueryError } from '../../utils/errors';

export class LevelRepository extends BaseRepository {
  async getUserXP(guildId: string, userId: string): Promise<UserXPRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_xp')
        .select('*')
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as UserXPRow;
    } catch (error) {
      if (error instanceof Error && 'code' in error) throw error;
      logError(`Error fetching user XP for ${userId} in guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to fetch user XP');
    }
  }

  async getOrCreateUserXP(guildId: string, userId: string): Promise<UserXPRow> {
    try {
      const { error: upsertError } = await this.supabase
        .from('user_xp')
        .upsert(
          { guild_id: guildId, user_id: userId, xp: 0, level: 0, total_messages: 0 },
          { onConflict: 'guild_id,user_id', ignoreDuplicates: true }
        );

      if (upsertError) {
        logError(`Error upserting user XP for ${userId} in guild ${guildId}`, upsertError);
      }

      const existing = await this.getUserXP(guildId, userId);
      if (existing) return existing;

      const { data, error } = await this.supabase
        .from('user_xp')
        .select('*')
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .single();

      if (error) {
        throw new DatabaseQueryError(`Failed to get user XP: ${error.message}`);
      }

      return data as UserXPRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getOrCreateUserXP for ${userId}`, error);
      throw new DatabaseQueryError('Failed to get or create user XP');
    }
  }

  async addXP(
    guildId: string,
    userId: string,
    amount: number
  ): Promise<UserXPRow> {
    try {
      await this.getOrCreateUserXP(guildId, userId);

      const { data: current, error: readErr } = await this.supabase
        .from('user_xp')
        .select('xp, total_messages')
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .single();

      if (readErr) {
        logError(`Error reading XP for ${userId} in guild ${guildId}`, readErr);
        throw new DatabaseQueryError('Failed to read XP');
      }

      const newXp = Math.max(0, (current?.xp || 0) + amount);
      const newMessages = (current?.total_messages || 0) + 1;

      const { data, error } = await this.supabase
        .from('user_xp')
        .update({
          xp: newXp,
          total_messages: newMessages,
          last_xp_at: new Date().toISOString(),
        })
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        logError(`Error adding XP for ${userId} in guild ${guildId}`, error);
        throw new DatabaseQueryError(`Failed to add XP`);
      }

      return data as UserXPRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in addXP`, error);
      throw new DatabaseQueryError('Failed to add XP');
    }
  }

  async setXP(
    guildId: string,
    userId: string,
    amount: number
  ): Promise<UserXPRow> {
    try {
      await this.getOrCreateUserXP(guildId, userId);

      const newXp = Math.max(0, amount);

      const { data, error } = await this.supabase
        .from('user_xp')
        .update({ xp: newXp })
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        logError(`Error setting XP for ${userId} in guild ${guildId}`, error);
        throw new DatabaseQueryError(`Failed to set XP`);
      }

      return data as UserXPRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in setXP`, error);
      throw new DatabaseQueryError('Failed to set XP');
    }
  }

  async removeXP(
    guildId: string,
    userId: string,
    amount: number
  ): Promise<UserXPRow> {
    try {
      await this.getOrCreateUserXP(guildId, userId);

      const { data: current, error: readErr } = await this.supabase
        .from('user_xp')
        .select('xp')
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .single();

      if (readErr) {
        logError(`Error reading XP for ${userId} in guild ${guildId}`, readErr);
        throw new DatabaseQueryError('Failed to read XP');
      }

      const newXp = Math.max(0, (current?.xp || 0) - amount);

      const { data, error } = await this.supabase
        .from('user_xp')
        .update({ xp: newXp })
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        logError(`Error removing XP for ${userId} in guild ${guildId}`, error);
        throw new DatabaseQueryError(`Failed to remove XP`);
      }

      return data as UserXPRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in removeXP`, error);
      throw new DatabaseQueryError('Failed to remove XP');
    }
  }

  async resetUserXP(guildId: string, userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('user_xp')
        .delete()
        .eq('guild_id', guildId)
        .eq('user_id', userId);

      if (error) {
        logError(`Error resetting XP for ${userId} in guild ${guildId}`, error);
        throw new DatabaseQueryError(`Failed to reset XP`);
      }
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in resetUserXP`, error);
      throw new DatabaseQueryError('Failed to reset XP');
    }
  }

  async resetGuildXP(guildId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('user_xp')
        .delete()
        .eq('guild_id', guildId);

      if (error) {
        logError(`Error resetting guild XP for ${guildId}`, error);
        throw new DatabaseQueryError(`Failed to reset guild XP`);
      }
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in resetGuildXP`, error);
      throw new DatabaseQueryError('Failed to reset guild XP');
    }
  }

  async getLeaderboard(
    guildId: string,
    limit: number = 10
  ): Promise<LeaderboardEntry[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_xp')
        .select('user_id, xp, level')
        .eq('guild_id', guildId)
        .order('xp', { ascending: false })
        .limit(limit);

      if (error) {
        logError(`Error fetching leaderboard for guild ${guildId}`, error);
        throw new DatabaseQueryError(`Failed to fetch leaderboard`);
      }

      return ((data || []) as Array<{ user_id: string; xp: number; level: number }>).map(
        (row, index) => ({
          rank: index + 1,
          user_id: row.user_id,
          xp: row.xp,
          level: row.level,
        })
      );
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getLeaderboard`, error);
      throw new DatabaseQueryError('Failed to fetch leaderboard');
    }
  }

  async getUserRank(guildId: string, userId: string): Promise<number | null> {
    try {
      const user = await this.getUserXP(guildId, userId);
      if (!user) return null;

      const { count, error } = await this.supabase
        .from('user_xp')
        .select('id', { count: 'exact', head: true })
        .eq('guild_id', guildId)
        .gt('xp', user.xp);

      if (error) return null;
      return (count || 0) + 1;
    } catch {
      return null;
    }
  }
}
