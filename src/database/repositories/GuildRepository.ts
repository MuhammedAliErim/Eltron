import { BaseRepository } from '../BaseRepository';
import { GuildRow } from '../schema';
import { logError } from '../../utils/logger';
import { DatabaseQueryError } from '../../utils/errors';

export class GuildRepository extends BaseRepository {
  async getOrCreateGuild(guildId: string, name: string, ownerId: string): Promise<GuildRow> {
    try {
      const { data: existing, error: selectError } = await this.supabase
        .from('guilds')
        .select('*')
        .eq('guild_id', guildId)
        .single();

      if (existing && !selectError) {
        return existing as GuildRow;
      }

      const { data: created, error: createError } = await this.supabase
        .from('guilds')
        .insert({
          guild_id: guildId,
          name,
          owner_id: ownerId,
          language: 'tr',
          timezone: 'Europe/Istanbul',
          settings: {},
        })
        .select()
        .single();

      if (createError) {
        if (createError.code === '23505') {
          const { data: raceRecovery, error: raceError } = await this.supabase
            .from('guilds')
            .select('*')
            .eq('guild_id', guildId)
            .single();

          if (raceRecovery && !raceError) {
            return raceRecovery as GuildRow;
          }

          logError(`Failed to recover guild ${guildId} after race`, raceError);
          throw new DatabaseQueryError(`Failed to recover guild ${guildId}`);
        }

        logError(`Failed to create guild ${guildId}`, createError);
        throw new DatabaseQueryError(`Failed to create guild: ${createError.message}`);
      }

      return created as GuildRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getOrCreateGuild for guild ${guildId}`, error);
      throw new DatabaseQueryError(`Database error for guild ${guildId}`);
    }
  }

  async get(guildId: string): Promise<GuildRow | null> {
    return this.getGuild(guildId);
  }

  async getAllGuildIds(): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('guilds')
        .select('guild_id');

      if (error) {
        logError('Error fetching all guild IDs', error);
        throw new DatabaseQueryError('Failed to fetch guild IDs');
      }

      return (data || []).map((row: { guild_id: string }) => row.guild_id);
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError('Error in getAllGuildIds', error);
      throw new DatabaseQueryError('Failed to fetch guild IDs');
    }
  }

  async getGuild(guildId: string): Promise<GuildRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('guilds')
        .select('*')
        .eq('guild_id', guildId)
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as GuildRow;
    } catch (error) {
      if (error instanceof Error && 'code' in error) throw error;
      logError(`Error in getGuild for guild ${guildId}`, error);
      throw new DatabaseQueryError(`Failed to fetch guild ${guildId}`);
    }
  }

  async updateSettings(
    guildId: string,
    settings: Partial<Pick<GuildRow, 'language' | 'timezone' | 'settings'>>
  ): Promise<GuildRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('guilds')
        .update({ ...settings, updated_at: new Date().toISOString() })
        .eq('guild_id', guildId)
        .select()
        .single();

      if (error) {
        logError(`Error updating settings for guild ${guildId}`, error);
        throw new DatabaseQueryError(`Failed to update guild settings: ${error.message}`);
      }

      return data as GuildRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error updating settings for guild ${guildId}`, error);
      throw new DatabaseQueryError(`Failed to update guild settings for ${guildId}`);
    }
  }
}
