import { BaseRepository } from '../BaseRepository';
import { StaffMemberRow, StaffMemberCreate, StaffMemberUpdate } from '../schema';
import { logError } from '../../utils/logger';
import { DatabaseQueryError } from '../../utils/errors';

export class StaffRepository extends BaseRepository {
  async addStaff(data: StaffMemberCreate): Promise<StaffMemberRow> {
    try {
      const { data: created, error } = await this.supabase
        .from('staff_members')
        .insert({
          guild_id: data.guild_id,
          user_id: data.user_id,
          staff_role: data.staff_role || 'STAFF',
          added_by: data.added_by || null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return null as unknown as StaffMemberRow;
        }
        logError(`Error adding staff for guild ${data.guild_id}`, error);
        throw new DatabaseQueryError(`Failed to add staff: ${error.message}`);
      }

      return created as StaffMemberRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in addStaff for guild ${data.guild_id}`, error);
      throw new DatabaseQueryError('Failed to add staff');
    }
  }

  async getStaff(guildId: string, userId: string): Promise<StaffMemberRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('staff_members')
        .select('*')
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as StaffMemberRow;
    } catch (error) {
      if (error instanceof Error && 'code' in error) throw error;
      logError(`Error fetching staff ${userId} in guild ${guildId}`, error);
      throw new DatabaseQueryError(`Failed to fetch staff`);
    }
  }

  async listStaff(guildId: string, status?: string): Promise<StaffMemberRow[]> {
    try {
      let query = this.supabase
        .from('staff_members')
        .select('*')
        .eq('guild_id', guildId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        logError(`Error listing staff for guild ${guildId}`, error);
        throw new DatabaseQueryError(`Failed to list staff`);
      }

      return (data || []) as StaffMemberRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in listStaff for guild ${guildId}`, error);
      throw new DatabaseQueryError(`Failed to list staff`);
    }
  }

  async updateStaff(
    guildId: string,
    userId: string,
    updates: StaffMemberUpdate
  ): Promise<StaffMemberRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('staff_members')
        .update(updates)
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        logError(`Error updating staff ${userId} in guild ${guildId}`, error);
        throw new DatabaseQueryError(`Failed to update staff`);
      }

      return data as StaffMemberRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in updateStaff`, error);
      throw new DatabaseQueryError(`Failed to update staff`);
    }
  }

  async removeStaff(guildId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('staff_members')
        .delete()
        .eq('guild_id', guildId)
        .eq('user_id', userId);

      if (error) {
        logError(`Error removing staff ${userId} from guild ${guildId}`, error);
        throw new DatabaseQueryError(`Failed to remove staff`);
      }

      return true;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in removeStaff`, error);
      throw new DatabaseQueryError(`Failed to remove staff`);
    }
  }

  async isStaff(guildId: string, userId: string): Promise<boolean> {
    try {
      const { count, error } = await this.supabase
        .from('staff_members')
        .select('id', { count: 'exact', head: true })
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .eq('status', 'ACTIVE');

      if (error) return false;
      return (count || 0) > 0;
    } catch {
      return false;
    }
  }
}
