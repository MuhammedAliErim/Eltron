import { BaseRepository } from '../BaseRepository';
import { ReactionRoleRow, ReactionRoleCreate } from '../schema';
import { logError } from '../../utils/logger';
import { DatabaseQueryError } from '../../utils/errors';

export class ReactionRoleRepository extends BaseRepository {
  async create(data: ReactionRoleCreate): Promise<ReactionRoleRow> {
    try {
      const { data: created, error } = await this.supabase
        .from('reaction_roles')
        .insert({
          guild_id: data.guild_id,
          channel_id: data.channel_id,
          message_id: data.message_id,
          title: data.title,
          description: data.description || null,
          color: data.color || '#5865F2',
          emoji: data.emoji,
          role_id: data.role_id,
          created_by: data.created_by,
        })
        .select()
        .single();

      if (error) {
        logError(`Error creating reaction role for guild ${data.guild_id}`, error);
        throw new DatabaseQueryError(`Failed to create reaction role: ${error.message}`);
      }

      return created as ReactionRoleRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in create reaction role for guild ${data.guild_id}`, error);
      throw new DatabaseQueryError('Failed to create reaction role');
    }
  }

  async getById(id: string): Promise<ReactionRoleRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('reaction_roles')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as ReactionRoleRow;
    } catch (error) {
      if (error instanceof Error && 'code' in error) throw error;
      logError(`Error fetching reaction role ${id}`, error);
      throw new DatabaseQueryError(`Failed to fetch reaction role ${id}`);
    }
  }

  async getByMessage(messageId: string): Promise<ReactionRoleRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('reaction_roles')
        .select('*')
        .eq('message_id', messageId);

      if (error) {
        logError(`Error fetching reaction roles for message ${messageId}`, error);
        throw new DatabaseQueryError('Failed to fetch reaction roles');
      }

      return (data || []) as ReactionRoleRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getByMessage for ${messageId}`, error);
      throw new DatabaseQueryError('Failed to fetch reaction roles');
    }
  }

  async getByMessageAndEmoji(messageId: string, emoji: string): Promise<ReactionRoleRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('reaction_roles')
        .select('*')
        .eq('message_id', messageId)
        .eq('emoji', emoji)
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as ReactionRoleRow;
    } catch (error) {
      if (error instanceof Error && 'code' in error) throw error;
      logError(`Error fetching reaction role for message ${messageId} emoji ${emoji}`, error);
      throw new DatabaseQueryError('Failed to fetch reaction role');
    }
  }

  async getByGuild(guildId: string): Promise<ReactionRoleRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('reaction_roles')
        .select('*')
        .eq('guild_id', guildId)
        .order('created_at', { ascending: false });

      if (error) {
        logError(`Error fetching reaction roles for guild ${guildId}`, error);
        throw new DatabaseQueryError('Failed to fetch reaction roles');
      }

      return (data || []) as ReactionRoleRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getByGuild for ${guildId}`, error);
      throw new DatabaseQueryError('Failed to fetch reaction roles');
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('reaction_roles')
        .delete()
        .eq('id', id)
        .select('id');

      if (error) {
        logError(`Error deleting reaction role ${id}`, error);
        throw new DatabaseQueryError(`Failed to delete reaction role`);
      }

      return (data || []).length > 0;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in delete reaction role ${id}`, error);
      throw new DatabaseQueryError('Failed to delete reaction role');
    }
  }

  async incrementUses(id: string): Promise<void> {
    try {
      const { data: current } = await this.supabase
        .from('reaction_roles')
        .select('current_uses')
        .eq('id', id)
        .single();

      if (current) {
        await this.supabase
          .from('reaction_roles')
          .update({ current_uses: (current.current_uses || 0) + 1 })
          .eq('id', id);
      }
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in incrementUses for reaction role ${id}`, error);
      throw new DatabaseQueryError('Failed to increment uses');
    }
  }

  async decrementUses(id: string): Promise<void> {
    try {
      const { data: current } = await this.supabase
        .from('reaction_roles')
        .select('current_uses')
        .eq('id', id)
        .single();

      if (current && current.current_uses > 0) {
        await this.supabase
          .from('reaction_roles')
          .update({ current_uses: current.current_uses - 1 })
          .eq('id', id);
      }
    } catch (error) {
      logError(`Error in decrementUses for reaction role ${id}`, error);
      throw new DatabaseQueryError('Failed to decrement uses');
    }
  }
}
