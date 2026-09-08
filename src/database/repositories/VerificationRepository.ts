import { BaseRepository } from '../BaseRepository';
import {
  GuildVerificationConfigRow,
  GuildVerificationConfigUpdate,
} from '../schema';
import { logError } from '../../utils/logger';
import { DatabaseQueryError } from '../../utils/errors';

export class VerificationRepository extends BaseRepository {
  async getConfig(guildId: string): Promise<GuildVerificationConfigRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('guild_verification_config')
        .select('*')
        .eq('guild_id', guildId)
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as GuildVerificationConfigRow;
    } catch (error) {
      if (this.isTableMissingError(error)) return this.handleTableError(error, `verification config for guild ${guildId}`);
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error fetching verification config for guild ${guildId}`, error);
      throw new DatabaseQueryError(`Failed to fetch verification config for guild ${guildId}`);
    }
  }

  async getOrCreateConfig(guildId: string): Promise<GuildVerificationConfigRow> {
    try {
      const existing = await this.getConfig(guildId);
      if (existing) return existing;

      const { data: created, error: createError } = await this.supabase
        .from('guild_verification_config')
        .insert({ guild_id: guildId })
        .select()
        .single();

      if (createError) {
        if (createError.code === '23505') {
          const recovery = await this.getConfig(guildId);
          if (recovery) return recovery;
        }
        logError(`Failed to create verification config for guild ${guildId}`, createError);
        throw new DatabaseQueryError(`Failed to create verification config: ${createError.message}`);
      }

      return created as GuildVerificationConfigRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getOrCreateConfig for guild ${guildId}`, error);
      throw new DatabaseQueryError(`Database error for guild ${guildId} verification config`);
    }
  }

  async updateConfig(
    guildId: string,
    updates: GuildVerificationConfigUpdate
  ): Promise<GuildVerificationConfigRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('guild_verification_config')
        .update(updates)
        .eq('guild_id', guildId)
        .select()
        .single();

      if (error) {
        logError(`Error updating verification config for guild ${guildId}`, error);
        throw new DatabaseQueryError(`Failed to update verification config: ${error.message}`);
      }

      return data as GuildVerificationConfigRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error updating verification config for guild ${guildId}`, error);
      throw new DatabaseQueryError(`Failed to update verification config for guild ${guildId}`);
    }
  }

  async getVerificationStatus(
    guildId: string,
    userId: string
  ): Promise<{ status: string; method: string } | null> {
    try {
      const { data, error } = await this.supabase
        .from('verification')
        .select('status, method')
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as { status: string; method: string };
    } catch (error) {
      if (error instanceof Error && 'code' in error) throw error;
      logError(`Error fetching verification status for ${userId} in guild ${guildId}`, error);
      return null;
    }
  }

  async upsertVerification(
    guildId: string,
    userId: string,
    status: string,
    method: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('verification')
        .upsert(
          {
            guild_id: guildId,
            user_id: userId,
            status,
            method,
            verified_at: status === 'verified' ? new Date().toISOString() : null,
          },
          { onConflict: 'guild_id,user_id' }
        );

      if (error) {
        logError(`Error upserting verification for ${userId} in guild ${guildId}`, error);
        throw new DatabaseQueryError(`Failed to update verification: ${error.message}`);
      }
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in upsertVerification for ${userId}`, error);
      throw new DatabaseQueryError('Failed to update verification status');
    }
  }
}
