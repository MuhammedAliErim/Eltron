import { BaseRepository } from '../BaseRepository';
import {
  GuildAutomodConfigRow,
  GuildAutomodConfigUpdate,
  AutomodRuleRow,
  AutomodRuleCreate,
} from '../schema';
import { logError } from '../../utils/logger';
import { DatabaseQueryError } from '../../utils/errors';

export class AutomodRepository extends BaseRepository {
  async getConfig(guildId: string): Promise<GuildAutomodConfigRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('guild_automod_config')
        .select('*')
        .eq('guild_id', guildId)
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as GuildAutomodConfigRow;
    } catch (error) {
      if (this.isTableMissingError(error)) return this.handleTableError(error, `automod config for guild ${guildId}`);
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error fetching automod config for guild ${guildId}`, error);
      throw new DatabaseQueryError(`Failed to fetch automod config for guild ${guildId}`);
    }
  }

  async getOrCreateConfig(guildId: string): Promise<GuildAutomodConfigRow> {
    try {
      const existing = await this.getConfig(guildId);
      if (existing) return existing;

      const { data: created, error: createError } = await this.supabase
        .from('guild_automod_config')
        .insert({ guild_id: guildId })
        .select()
        .single();

      if (createError) {
        if (createError.code === '23505') {
          const recovery = await this.getConfig(guildId);
          if (recovery) return recovery;
        }
        logError(`Failed to create automod config for guild ${guildId}`, createError);
        throw new DatabaseQueryError(`Failed to create automod config: ${createError.message}`);
      }

      return created as GuildAutomodConfigRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getOrCreateConfig for guild ${guildId}`, error);
      throw new DatabaseQueryError(`Database error for guild ${guildId} automod config`);
    }
  }

  async updateConfig(
    guildId: string,
    updates: GuildAutomodConfigUpdate
  ): Promise<GuildAutomodConfigRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('guild_automod_config')
        .update(updates)
        .eq('guild_id', guildId)
        .select()
        .single();

      if (error) {
        logError(`Error updating automod config for guild ${guildId}`, error);
        throw new DatabaseQueryError(`Failed to update automod config: ${error.message}`);
      }

      return data as GuildAutomodConfigRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error updating automod config for guild ${guildId}`, error);
      throw new DatabaseQueryError(`Failed to update automod config for guild ${guildId}`);
    }
  }

  async getGuildRules(guildId: string): Promise<AutomodRuleRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('automod_rules')
        .select('*')
        .eq('guild_id', guildId)
        .eq('enabled', true)
        .order('created_at', { ascending: true });

      if (error) {
        const errObj = error as Record<string, unknown>;
        logError(`[DEBUG automod_rules query] guild=${guildId} code=${errObj.code} message=${errObj.message} details=${errObj.details} hint=${errObj.hint}`, error);
        throw error;
      }

      return (data as AutomodRuleRow[]) || [];
    } catch (error) {
      if (this.isTableMissingError(error)) return this.handleTableError(error, `automod rules for guild ${guildId}`) as unknown as AutomodRuleRow[];
      const errObj = error as Record<string, unknown>;
      logError(`[DEBUG automod_rules catch] guild=${guildId} code=${errObj.code} message=${errObj.message} details=${errObj.details} hint=${errObj.hint}`, error);
      throw new DatabaseQueryError(`Failed to fetch automod rules for guild ${guildId}`);
    }
  }

  async createRule(data: AutomodRuleCreate): Promise<AutomodRuleRow> {
    try {
      const { data: created, error } = await this.supabase
        .from('automod_rules')
        .insert({
          guild_id: data.guild_id,
          name: data.name,
          trigger_type: data.trigger_type,
          trigger_value: data.trigger_value,
          action_type: data.action_type,
          action_value: data.action_value || '',
        })
        .select()
        .single();

      if (error) {
        logError('Failed to create automod rule', error);
        throw new DatabaseQueryError(`Failed to create automod rule: ${error.message}`);
      }

      return created as AutomodRuleRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError('Error in createRule', error);
      throw new DatabaseQueryError('Failed to create automod rule');
    }
  }

  async deleteRule(guildId: string, ruleId: number): Promise<boolean> {
    try {
      const { error, count } = await this.supabase
        .from('automod_rules')
        .delete()
        .eq('guild_id', guildId)
        .eq('id', ruleId);

      if (error) {
        logError(`Error deleting automod rule ${ruleId}`, error);
        throw new DatabaseQueryError(`Failed to delete rule: ${error.message}`);
      }

      return (count ?? 0) > 0;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error deleting automod rule ${ruleId}`, error);
      throw new DatabaseQueryError(`Failed to delete rule ${ruleId}`);
    }
  }

  async toggleRule(guildId: string, ruleId: number, enabled: boolean): Promise<AutomodRuleRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('automod_rules')
        .update({ enabled })
        .eq('guild_id', guildId)
        .eq('id', ruleId)
        .select()
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as AutomodRuleRow;
    } catch (error) {
      if (error instanceof Error && 'code' in error) throw error;
      logError(`Error toggling rule ${ruleId}`, error);
      throw new DatabaseQueryError(`Failed to toggle rule ${ruleId}`);
    }
  }
}
