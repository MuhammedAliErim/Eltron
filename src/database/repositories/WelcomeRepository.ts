import { BaseRepository } from '../BaseRepository';
import { WelcomeConfigRow, WelcomeConfigUpdate } from '../schema';
import { logError } from '../../utils/logger';
import { DatabaseQueryError } from '../../utils/errors';

const DEFAULT_CONFIG: WelcomeConfigRow = {
  guild_id: '',
  welcome_enabled: false,
  welcome_channel_id: null,
  welcome_message: 'Welcome to {server}, {user}!',
  welcome_use_embed: false,
  welcome_embed_title: 'Welcome!',
  welcome_embed_description: 'Welcome to {server}, {user}!',
  welcome_embed_color: '#00FF00',
  goodbye_enabled: false,
  goodbye_channel_id: null,
  goodbye_message: 'Goodbye {user}, we will miss you!',
  goodbye_use_embed: false,
  goodbye_embed_title: 'Goodbye!',
  goodbye_embed_description: 'Goodbye {user}, we will miss you!',
  goodbye_embed_color: '#FF0000',
  created_at: '',
  updated_at: '',
};

export class WelcomeRepository extends BaseRepository {
  async getConfig(guildId: string): Promise<WelcomeConfigRow> {
    try {
      const { data, error } = await this.supabase
        .from('welcome_config')
        .select('*')
        .eq('guild_id', guildId)
        .single();

      if (error && error.code === 'PGRST116') {
        return { ...DEFAULT_CONFIG, guild_id: guildId };
      }
      if (error) throw error;

      return data as WelcomeConfigRow;
    } catch (error) {
      if (error instanceof Error && 'code' in error) throw error;
      logError(`Error fetching welcome config for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to fetch welcome config');
    }
  }

  async upsertConfig(
    guildId: string,
    updates: WelcomeConfigUpdate
  ): Promise<WelcomeConfigRow> {
    try {
      const { data, error } = await this.supabase
        .from('welcome_config')
        .upsert(
          { guild_id: guildId, ...updates },
          { onConflict: 'guild_id' }
        )
        .select()
        .single();

      if (error) {
        logError(`Error upserting welcome config for guild ${guildId}`, error);
        throw new DatabaseQueryError(`Failed to update welcome config: ${error.message}`);
      }

      return data as WelcomeConfigRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in upsertConfig for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to update welcome config');
    }
  }

  async resetConfig(guildId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('welcome_config')
        .delete()
        .eq('guild_id', guildId);

      if (error) {
        logError(`Error resetting welcome config for guild ${guildId}`, error);
        throw new DatabaseQueryError(`Failed to reset welcome config`);
      }
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in resetConfig for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to reset welcome config');
    }
  }
}
