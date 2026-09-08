import { BaseRepository } from '../BaseRepository';
import {
  GuildQuarantineConfigRow,
  GuildQuarantineConfigUpdate,
} from '../schema';
import { logError } from '../../utils/logger';
import { DatabaseQueryError } from '../../utils/errors';

export class QuarantineRepository extends BaseRepository {
  async getConfig(guildId: string): Promise<GuildQuarantineConfigRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('guild_quarantine_config')
        .select('*')
        .eq('guild_id', guildId)
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as GuildQuarantineConfigRow;
    } catch (error) {
      if (this.isTableMissingError(error)) return this.handleTableError(error, `quarantine config for guild ${guildId}`);
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error fetching quarantine config for guild ${guildId}`, error);
      throw new DatabaseQueryError(`Failed to fetch quarantine config for guild ${guildId}`);
    }
  }

  async getOrCreateConfig(guildId: string): Promise<GuildQuarantineConfigRow> {
    try {
      const existing = await this.getConfig(guildId);
      if (existing) return existing;

      const { data: created, error: createError } = await this.supabase
        .from('guild_quarantine_config')
        .insert({ guild_id: guildId })
        .select()
        .single();

      if (createError) {
        if (createError.code === '23505') {
          const recovery = await this.getConfig(guildId);
          if (recovery) return recovery;
        }
        logError(`Failed to create quarantine config for guild ${guildId}`, createError);
        throw new DatabaseQueryError(`Failed to create quarantine config: ${createError.message}`);
      }

      return created as GuildQuarantineConfigRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getOrCreateConfig for guild ${guildId}`, error);
      throw new DatabaseQueryError(`Database error for guild ${guildId} quarantine config`);
    }
  }

  async updateConfig(
    guildId: string,
    updates: GuildQuarantineConfigUpdate
  ): Promise<GuildQuarantineConfigRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('guild_quarantine_config')
        .update(updates)
        .eq('guild_id', guildId)
        .select()
        .single();

      if (error) {
        logError(`Error updating quarantine config for guild ${guildId}`, error);
        throw new DatabaseQueryError(`Failed to update quarantine config: ${error.message}`);
      }

      return data as GuildQuarantineConfigRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error updating quarantine config for guild ${guildId}`, error);
      throw new DatabaseQueryError(`Failed to update quarantine config for guild ${guildId}`);
    }
  }

  async logAction(
    guildId: string,
    userId: string,
    action: string,
    reason: string | null,
    performedBy: string | null,
    durationSeconds: number | null
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('quarantine_logs')
        .insert({
          guild_id: guildId,
          user_id: userId,
          action,
          reason,
          performed_by: performedBy,
          duration_seconds: durationSeconds,
        });

      if (error) {
        logError(`Error logging quarantine action for ${userId}`, error);
      }
    } catch (error) {
      logError(`Error in logAction for ${userId}`, error);
    }
  }

  async logRelease(
    guildId: string,
    userId: string,
    performedBy: string | null
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('quarantine_logs')
        .update({ released_at: new Date().toISOString(), performed_by: performedBy })
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .is('released_at', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        logError(`Error logging quarantine release for ${userId}`, error);
      }
    } catch (error) {
      logError(`Error in logRelease for ${userId}`, error);
    }
  }
}
