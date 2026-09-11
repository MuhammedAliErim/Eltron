import { BaseRepository } from '../BaseRepository';
import { ReminderRow, ReminderCreate, ReminderUpdate } from '../schema';
import { logError } from '../../utils/logger';
import { DatabaseQueryError } from '../../utils/errors';

export class ReminderRepository extends BaseRepository {
  async createReminder(data: ReminderCreate): Promise<ReminderRow> {
    try {
      const { data: created, error } = await this.supabase
        .from('reminders')
        .insert({
          guild_id: data.guild_id,
          user_id: data.user_id,
          channel_id: data.channel_id,
          message: data.message,
          remind_at: data.remind_at,
          status: 'PENDING',
          recurring: data.recurring ?? false,
          interval_ms: data.interval_ms ?? null,
          next_run: data.next_run ?? null,
        })
        .select()
        .single();

      if (error) {
        logError(`Error creating reminder for user ${data.user_id}`, error);
        throw new DatabaseQueryError(`Failed to create reminder: ${error.message}`);
      }

      return created as ReminderRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in createReminder for user ${data.user_id}`, error);
      throw new DatabaseQueryError('Failed to create reminder');
    }
  }

  async getReminder(reminderId: number): Promise<ReminderRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('reminders')
        .select('*')
        .eq('id', reminderId)
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as ReminderRow;
    } catch (error) {
      if (error instanceof Error && 'code' in error) throw error;
      logError(`Error fetching reminder ${reminderId}`, error);
      throw new DatabaseQueryError(`Failed to fetch reminder ${reminderId}`);
    }
  }

  async getUserReminders(
    userId: string,
    guildId: string,
    status?: string
  ): Promise<ReminderRow[]> {
    try {
      let query = this.supabase
        .from('reminders')
        .select('*')
        .eq('user_id', userId)
        .eq('guild_id', guildId)
        .order('remind_at', { ascending: true });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        logError(`Error fetching reminders for user ${userId}`, error);
        throw new DatabaseQueryError('Failed to fetch user reminders');
      }

      return (data || []) as ReminderRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getUserReminders for user ${userId}`, error);
      throw new DatabaseQueryError('Failed to fetch user reminders');
    }
  }

  async getGuildReminders(guildId: string): Promise<ReminderRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('reminders')
        .select('*')
        .eq('guild_id', guildId)
        .order('remind_at', { ascending: true });

      if (error) {
        logError(`Error fetching reminders for guild ${guildId}`, error);
        throw new DatabaseQueryError('Failed to fetch guild reminders');
      }

      return (data || []) as ReminderRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getGuildReminders for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to fetch guild reminders');
    }
  }

  async getPendingReminders(): Promise<ReminderRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('reminders')
        .select('*')
        .eq('status', 'PENDING')
        .order('remind_at', { ascending: true });

      if (error) {
        logError('Error fetching pending reminders', error);
        throw new DatabaseQueryError('Failed to fetch pending reminders');
      }

      return (data || []) as ReminderRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError('Error in getPendingReminders', error);
      throw new DatabaseQueryError('Failed to fetch pending reminders');
    }
  }

  async countActiveReminders(userId: string, guildId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('reminders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('guild_id', guildId)
        .eq('status', 'PENDING');

      if (error) return 0;
      return count || 0;
    } catch {
      return 0;
    }
  }

  async updateReminder(reminderId: number, updates: ReminderUpdate): Promise<ReminderRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('reminders')
        .update(updates)
        .eq('id', reminderId)
        .select()
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) {
        logError(`Error updating reminder ${reminderId}`, error);
        throw new DatabaseQueryError(`Failed to update reminder ${reminderId}: ${error.message}`);
      }

      return data as ReminderRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in updateReminder ${reminderId}`, error);
      throw new DatabaseQueryError(`Failed to update reminder ${reminderId}`);
    }
  }

  async cancelReminder(reminderId: number): Promise<ReminderRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('reminders')
        .update({ status: 'CANCELLED' })
        .eq('id', reminderId)
        .eq('status', 'PENDING')
        .select()
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) {
        logError(`Error cancelling reminder ${reminderId}`, error);
        throw new DatabaseQueryError(`Failed to cancel reminder ${reminderId}`);
      }

      return data as ReminderRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in cancelReminder ${reminderId}`, error);
      throw new DatabaseQueryError(`Failed to cancel reminder ${reminderId}`);
    }
  }

  async markTriggered(reminderId: number): Promise<ReminderRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('reminders')
        .update({ status: 'TRIGGERED' })
        .eq('id', reminderId)
        .eq('status', 'PENDING')
        .select()
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) {
        logError(`Error marking reminder ${reminderId} as triggered`, error);
        throw new DatabaseQueryError(`Failed to mark reminder ${reminderId} as triggered`);
      }

      return data as ReminderRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in markTriggered ${reminderId}`, error);
      throw new DatabaseQueryError(`Failed to mark reminder ${reminderId} as triggered`);
    }
  }

  async deleteReminder(reminderId: number): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('reminders')
        .delete()
        .eq('id', reminderId)
        .select('id');

      if (error) {
        logError(`Error deleting reminder ${reminderId}`, error);
        throw new DatabaseQueryError(`Failed to delete reminder ${reminderId}`);
      }

      return (data || []).length > 0;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in deleteReminder ${reminderId}`, error);
      throw new DatabaseQueryError(`Failed to delete reminder ${reminderId}`);
    }
  }
}
