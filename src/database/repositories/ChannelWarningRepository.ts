import { BaseRepository } from '../BaseRepository';
import {
  GuildChannelWarningConfigRow,
  GuildChannelWarningConfigUpdate,
} from '../schema';
import { logError } from '../../utils/logger';
import { DatabaseQueryError } from '../../utils/errors';

export class ChannelWarningRepository extends BaseRepository {
  async getConfig(guildId: string): Promise<GuildChannelWarningConfigRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('guild_channel_warning_config')
        .select('*')
        .eq('guild_id', guildId)
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) {
        const errObj = error as Record<string, unknown>;
        logError(`[DEBUG guild_channel_warning_config query] guild=${guildId} code=${errObj.code} message=${errObj.message} details=${errObj.details} hint=${errObj.hint}`, error);
        throw error;
      }

      return data as GuildChannelWarningConfigRow;
    } catch (error) {
      if (this.isTableMissingError(error)) return this.handleTableError(error, `channel warning config for guild ${guildId}`);
      if (error instanceof DatabaseQueryError) throw error;
      const errObj = error as Record<string, unknown>;
      logError(`[DEBUG guild_channel_warning_config catch] guild=${guildId} code=${errObj.code} message=${errObj.message} details=${errObj.details} hint=${errObj.hint}`, error);
      throw new DatabaseQueryError(`Failed to fetch channel warning config for guild ${guildId}`);
    }
  }

  async getOrCreateConfig(guildId: string): Promise<GuildChannelWarningConfigRow> {
    try {
      const existing = await this.getConfig(guildId);
      if (existing) return existing;

      const { data: created, error: createError } = await this.supabase
        .from('guild_channel_warning_config')
        .insert({ guild_id: guildId })
        .select()
        .single();

      if (createError) {
        if (createError.code === '23505') {
          const recovery = await this.getConfig(guildId);
          if (recovery) return recovery;
        }
        logError(`Failed to create channel warning config for guild ${guildId}`, createError);
        throw new DatabaseQueryError(`Failed to create channel warning config: ${createError.message}`);
      }

      return created as GuildChannelWarningConfigRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getOrCreateConfig for guild ${guildId}`, error);
      throw new DatabaseQueryError(`Database error for guild ${guildId} channel warning config`);
    }
  }

  async updateConfig(
    guildId: string,
    updates: GuildChannelWarningConfigUpdate
  ): Promise<GuildChannelWarningConfigRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('guild_channel_warning_config')
        .update(updates)
        .eq('guild_id', guildId)
        .select()
        .single();

      if (error) {
        logError(`Error updating channel warning config for guild ${guildId}`, error);
        throw new DatabaseQueryError(`Failed to update channel warning config: ${error.message}`);
      }

      return data as GuildChannelWarningConfigRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error updating channel warning config for guild ${guildId}`, error);
      throw new DatabaseQueryError(`Failed to update channel warning config for guild ${guildId}`);
    }
  }

  async logAction(
    guildId: string,
    channelId: string,
    action: string,
    oldSlowmode: number | null,
    newSlowmode: number | null,
    reason: string | null,
    performedBy: string | null
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('channel_warning_logs')
        .insert({
          guild_id: guildId,
          channel_id: channelId,
          action,
          old_slowmode: oldSlowmode,
          new_slowmode: newSlowmode,
          reason,
          performed_by: performedBy,
        });

      if (error) {
        logError(`Error logging channel warning action for ${channelId}`, error);
      }
    } catch (error) {
      logError(`Error in logAction for ${channelId}`, error);
    }
  }
}
