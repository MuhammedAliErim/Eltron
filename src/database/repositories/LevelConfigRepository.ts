import { BaseRepository } from '../BaseRepository';
import { logError } from '../../utils/logger';
import { DatabaseQueryError } from '../../utils/errors';

export interface LevelingConfig {
  enabled: boolean;
  xpPerMessage: number;
  cooldownSeconds: number;
  levelUpMessage: string;
  levelUpChannel: string | null;
  levelUpEmbed: boolean;
  xpMultiplier: number;
  roleRewards: Record<string, string>;
}

export interface LevelRoleReward {
  id: string;
  guild_id: string;
  level: number;
  role_id: string;
  created_at: string;
}

const DEFAULT_CONFIG: LevelingConfig = {
  enabled: true,
  xpPerMessage: 15,
  cooldownSeconds: 60,
  levelUpMessage: 'Congratulations {user}! You reached level **{level}**!',
  levelUpChannel: null,
  levelUpEmbed: true,
  xpMultiplier: 1.0,
  roleRewards: {},
};

export class LevelConfigRepository extends BaseRepository {
  async getConfig(guildId: string): Promise<LevelingConfig> {
    try {
      const { data, error } = await this.supabase
        .from('guilds')
        .select('leveling_config')
        .eq('guild_id', guildId)
        .single();

      if (error && error.code === 'PGRST116') return { ...DEFAULT_CONFIG };
      if (error) throw error;

      const config = data?.leveling_config;
      if (!config || typeof config !== 'object') return { ...DEFAULT_CONFIG };

      return { ...DEFAULT_CONFIG, ...config } as LevelingConfig;
    } catch (error) {
      if (error instanceof Error && 'code' in error) throw error;
      logError(`Error fetching leveling config for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to fetch leveling config');
    }
  }

  async updateConfig(guildId: string, config: Partial<LevelingConfig>): Promise<LevelingConfig> {
    try {
      const current = await this.getConfig(guildId);
      const updated = { ...current, ...config };

      const { error } = await this.supabase
        .from('guilds')
        .update({ leveling_config: updated })
        .eq('guild_id', guildId);

      if (error) {
        logError(`Error updating leveling config for guild ${guildId}`, error);
        throw new DatabaseQueryError('Failed to update leveling config');
      }

      return updated;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in updateConfig for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to update leveling config');
    }
  }

  async getRoleRewards(guildId: string): Promise<LevelRoleReward[]> {
    try {
      const { data, error } = await this.supabase
        .from('level_role_rewards')
        .select('*')
        .eq('guild_id', guildId)
        .order('level', { ascending: true });

      if (error) throw error;
      return (data || []) as LevelRoleReward[];
    } catch (error) {
      if (error instanceof Error && 'code' in error) throw error;
      logError(`Error fetching role rewards for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to fetch role rewards');
    }
  }

  async addRoleReward(guildId: string, level: number, roleId: string): Promise<LevelRoleReward> {
    try {
      const { data, error } = await this.supabase
        .from('level_role_rewards')
        .upsert(
          { guild_id: guildId, level, role_id: roleId },
          { onConflict: 'guild_id,level' }
        )
        .select()
        .single();

      if (error) {
        logError(`Error adding role reward for guild ${guildId}`, error);
        throw new DatabaseQueryError('Failed to add role reward');
      }

      return data as LevelRoleReward;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in addRoleReward for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to add role reward');
    }
  }

  async removeRoleReward(guildId: string, level: number): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('level_role_rewards')
        .delete()
        .eq('guild_id', guildId)
        .eq('level', level);

      if (error) {
        logError(`Error removing role reward for guild ${guildId}`, error);
        throw new DatabaseQueryError('Failed to remove role reward');
      }
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in removeRoleReward for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to remove role reward');
    }
  }

  async getRoleRewardForLevel(guildId: string, level: number): Promise<LevelRoleReward | null> {
    try {
      const { data, error } = await this.supabase
        .from('level_role_rewards')
        .select('*')
        .eq('guild_id', guildId)
        .lte('level', level)
        .order('level', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as LevelRoleReward;
    } catch (error) {
      if (error instanceof Error && 'code' in error) throw error;
      logError(`Error fetching role reward for level ${level} in guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to fetch role reward for level');
    }
  }
}
