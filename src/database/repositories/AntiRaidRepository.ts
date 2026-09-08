import { BaseRepository } from '../BaseRepository';
import {
  GuildAntiRaidConfigRow,
  GuildAntiRaidConfigUpdate,
} from '../schema';
import { logError } from '../../utils/logger';
import { DatabaseQueryError } from '../../utils/errors';

export class AntiRaidRepository extends BaseRepository {
  async getConfig(guildId: string): Promise<GuildAntiRaidConfigRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('guild_anti_raid_config')
        .select('*')
        .eq('guild_id', guildId)
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) {
        const errObj = error as Record<string, unknown>;
        logError(`[DEBUG guild_anti_raid_config query] guild=${guildId} code=${errObj.code} message=${errObj.message} details=${errObj.details} hint=${errObj.hint}`, error);
        throw error;
      }

      return data as GuildAntiRaidConfigRow;
    } catch (error) {
      if (this.isTableMissingError(error)) return this.handleTableError(error, `anti-raid config for guild ${guildId}`);
      if (error instanceof DatabaseQueryError) throw error;
      const errObj = error as Record<string, unknown>;
      logError(`[DEBUG guild_anti_raid_config catch] guild=${guildId} code=${errObj.code} message=${errObj.message} details=${errObj.details} hint=${errObj.hint}`, error);
      throw new DatabaseQueryError(`Failed to fetch anti-raid config for guild ${guildId}`);
    }
  }

  async getOrCreateConfig(guildId: string): Promise<GuildAntiRaidConfigRow> {
    try {
      const existing = await this.getConfig(guildId);
      if (existing) return existing;

      const { data: created, error: createError } = await this.supabase
        .from('guild_anti_raid_config')
        .insert({ guild_id: guildId })
        .select()
        .single();

      if (createError) {
        if (createError.code === '23505') {
          const recovery = await this.getConfig(guildId);
          if (recovery) return recovery;
        }
        logError(`Failed to create anti-raid config for guild ${guildId}`, createError);
        throw new DatabaseQueryError(`Failed to create anti-raid config: ${createError.message}`);
      }

      return created as GuildAntiRaidConfigRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getOrCreateConfig for guild ${guildId}`, error);
      throw new DatabaseQueryError(`Database error for guild ${guildId} anti-raid config`);
    }
  }

  async updateConfig(
    guildId: string,
    updates: GuildAntiRaidConfigUpdate
  ): Promise<GuildAntiRaidConfigRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('guild_anti_raid_config')
        .update(updates)
        .eq('guild_id', guildId)
        .select()
        .single();

      if (error) {
        logError(`Error updating anti-raid config for guild ${guildId}`, error);
        throw new DatabaseQueryError(`Failed to update anti-raid config: ${error.message}`);
      }

      return data as GuildAntiRaidConfigRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error updating anti-raid config for guild ${guildId}`, error);
      throw new DatabaseQueryError(`Failed to update anti-raid config for guild ${guildId}`);
    }
  }

  async deleteConfig(guildId: string): Promise<boolean> {
    try {
      const { error, count } = await this.supabase
        .from('guild_anti_raid_config')
        .delete()
        .eq('guild_id', guildId);

      if (error) {
        logError(`Error deleting anti-raid config for guild ${guildId}`, error);
        throw new DatabaseQueryError(`Failed to delete anti-raid config: ${error.message}`);
      }

      return (count ?? 0) > 0;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error deleting anti-raid config for guild ${guildId}`, error);
      throw new DatabaseQueryError(`Failed to delete anti-raid config for guild ${guildId}`);
    }
  }
}
