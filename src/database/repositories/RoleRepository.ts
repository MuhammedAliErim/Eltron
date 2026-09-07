import { BaseRepository } from '../BaseRepository';
import { AutoRoleConfigRow, AutoRoleConfigUpdate } from '../schema';
import { logError } from '../../utils/logger';
import { DatabaseQueryError } from '../../utils/errors';

export class RoleRepository extends BaseRepository {
  async getAutoRoleConfig(guildId: string): Promise<AutoRoleConfigRow> {
    try {
      const { data, error } = await this.supabase
        .from('autorole_config')
        .select('*')
        .eq('guild_id', guildId)
        .single();

      if (error && error.code === 'PGRST116') {
        return {
          guild_id: guildId,
          role_id: null,
          enabled: false,
          created_at: '',
          updated_at: '',
        };
      }
      if (error) throw error;

      return data as AutoRoleConfigRow;
    } catch (error) {
      if (error instanceof Error && 'code' in error) throw error;
      logError(`Error fetching autorole config for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to fetch autorole config');
    }
  }

  async upsertAutoRoleConfig(
    guildId: string,
    updates: AutoRoleConfigUpdate
  ): Promise<AutoRoleConfigRow> {
    try {
      const { data, error } = await this.supabase
        .from('autorole_config')
        .upsert(
          { guild_id: guildId, ...updates },
          { onConflict: 'guild_id' }
        )
        .select()
        .single();

      if (error) {
        logError(`Error upserting autorole config for guild ${guildId}`, error);
        throw new DatabaseQueryError(`Failed to update autorole config: ${error.message}`);
      }

      return data as AutoRoleConfigRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in upsertAutoRoleConfig for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to update autorole config');
    }
  }

  async resetAutoRoleConfig(guildId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('autorole_config')
        .delete()
        .eq('guild_id', guildId);

      if (error) {
        logError(`Error resetting autorole config for guild ${guildId}`, error);
        throw new DatabaseQueryError('Failed to reset autorole config');
      }
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in resetAutoRoleConfig for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to reset autorole config');
    }
  }
}
