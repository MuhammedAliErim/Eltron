import { BaseRepository } from '../BaseRepository';
import { logError } from '../../utils/logger';
import { DatabaseQueryError } from '../../utils/errors';

export interface AfkUser {
  id: string;
  guild_id: string;
  user_id: string;
  reason: string;
  channel_id: string | null;
  created_at: string;
}

export class AfkRepository extends BaseRepository {
  async setAfk(guildId: string, userId: string, reason: string, channelId: string): Promise<AfkUser> {
    try {
      const { data, error } = await this.supabase
        .from('afk_users')
        .upsert({
          guild_id: guildId,
          user_id: userId,
          reason,
          channel_id: channelId,
        }, { onConflict: 'guild_id,user_id' })
        .select()
        .single();

      if (error) {
        logError(`Error setting AFK for user ${userId}`, error);
        throw new DatabaseQueryError(`Failed to set AFK: ${error.message}`);
      }

      return data as AfkUser;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in setAfk for user ${userId}`, error);
      throw new DatabaseQueryError('Failed to set AFK');
    }
  }

  async getAfk(guildId: string, userId: string): Promise<AfkUser | null> {
    try {
      const { data, error } = await this.supabase
        .from('afk_users')
        .select('*')
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as AfkUser;
    } catch (error) {
      if (error instanceof Error && 'code' in error) throw error;
      logError(`Error fetching AFK for user ${userId}`, error);
      return null;
    }
  }

  async removeAfk(guildId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('afk_users')
        .delete()
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .select('id');

      if (error) {
        logError(`Error removing AFK for user ${userId}`, error);
        throw new DatabaseQueryError(`Failed to remove AFK: ${error.message}`);
      }

      return (data || []).length > 0;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in removeAfk for user ${userId}`, error);
      throw new DatabaseQueryError('Failed to remove AFK');
    }
  }

  async getAllAfk(guildId: string): Promise<AfkUser[]> {
    try {
      const { data, error } = await this.supabase
        .from('afk_users')
        .select('*')
        .eq('guild_id', guildId);

      if (error) {
        logError(`Error fetching AFK users for guild ${guildId}`, error);
        throw new DatabaseQueryError('Failed to fetch AFK users');
      }

      return (data || []) as AfkUser[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getAllAfk for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to fetch AFK users');
    }
  }
}
