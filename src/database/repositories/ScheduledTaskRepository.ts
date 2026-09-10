import { BaseRepository } from '../BaseRepository';
import { logError } from '../../utils/logger';
import { DatabaseQueryError } from '../../utils/errors';

export interface ScheduledTaskRow {
  id: string;
  guild_id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  cron_expression: string | null;
  interval_ms: number | null;
  enabled: boolean;
  last_run: string | null;
  next_run: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduledTaskCreate {
  guild_id: string;
  name: string;
  type: string;
  config?: Record<string, unknown>;
  cron_expression?: string;
  interval_ms?: number;
  created_by: string;
}

export interface ScheduledTaskUpdate {
  name?: string;
  type?: string;
  config?: Record<string, unknown>;
  cron_expression?: string;
  interval_ms?: number;
  enabled?: boolean;
  last_run?: string;
  next_run?: string;
}

export class ScheduledTaskRepository extends BaseRepository {
  async create(data: ScheduledTaskCreate): Promise<ScheduledTaskRow> {
    try {
      const { data: created, error } = await this.supabase
        .from('scheduled_tasks')
        .insert({
          guild_id: data.guild_id,
          name: data.name,
          type: data.type,
          config: data.config || {},
          cron_expression: data.cron_expression || null,
          interval_ms: data.interval_ms || null,
          created_by: data.created_by,
        })
        .select()
        .single();

      if (error) {
        logError(`Error creating scheduled task for guild ${data.guild_id}`, error);
        throw new DatabaseQueryError(`Failed to create scheduled task: ${error.message}`);
      }

      return created as ScheduledTaskRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in create for scheduled task`, error);
      throw new DatabaseQueryError('Failed to create scheduled task');
    }
  }

  async getById(id: string): Promise<ScheduledTaskRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('scheduled_tasks')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as ScheduledTaskRow;
    } catch (error) {
      if (error instanceof Error && 'code' in error) throw error;
      logError(`Error fetching scheduled task ${id}`, error);
      throw new DatabaseQueryError(`Failed to fetch scheduled task ${id}`);
    }
  }

  async getByGuild(guildId: string): Promise<ScheduledTaskRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('scheduled_tasks')
        .select('*')
        .eq('guild_id', guildId)
        .order('created_at', { ascending: false });

      if (error) {
        logError(`Error fetching scheduled tasks for guild ${guildId}`, error);
        throw new DatabaseQueryError('Failed to fetch guild scheduled tasks');
      }

      return (data || []) as ScheduledTaskRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getByGuild for scheduled tasks`, error);
      throw new DatabaseQueryError('Failed to fetch guild scheduled tasks');
    }
  }

  async getEnabledTasks(): Promise<ScheduledTaskRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('scheduled_tasks')
        .select('*')
        .eq('enabled', true);

      if (error) {
        logError('Error fetching enabled scheduled tasks', error);
        throw new DatabaseQueryError('Failed to fetch enabled scheduled tasks');
      }

      return (data || []) as ScheduledTaskRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError('Error in getEnabledTasks', error);
      throw new DatabaseQueryError('Failed to fetch enabled scheduled tasks');
    }
  }

  async update(id: string, updates: ScheduledTaskUpdate): Promise<ScheduledTaskRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('scheduled_tasks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) {
        logError(`Error updating scheduled task ${id}`, error);
        throw new DatabaseQueryError(`Failed to update scheduled task ${id}: ${error.message}`);
      }

      return data as ScheduledTaskRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in update for scheduled task ${id}`, error);
      throw new DatabaseQueryError(`Failed to update scheduled task ${id}`);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('scheduled_tasks')
        .delete()
        .eq('id', id)
        .select('id');

      if (error) {
        logError(`Error deleting scheduled task ${id}`, error);
        throw new DatabaseQueryError(`Failed to delete scheduled task ${id}`);
      }

      return (data || []).length > 0;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in delete for scheduled task ${id}`, error);
      throw new DatabaseQueryError(`Failed to delete scheduled task ${id}`);
    }
  }

  async updateLastRun(id: string, lastRun: string, nextRun: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('scheduled_tasks')
        .update({
          last_run: lastRun,
          next_run: nextRun,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        logError(`Error updating last run for scheduled task ${id}`, error);
      }
    } catch (error) {
      logError(`Error in updateLastRun for scheduled task ${id}`, error);
    }
  }
}
