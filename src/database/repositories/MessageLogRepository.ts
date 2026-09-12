import { BaseRepository } from '../BaseRepository';
import { logError } from '../../utils/logger';
import { DatabaseQueryError } from '../../utils/errors';

export interface MessageLogData {
  guild_id: string;
  channel_id: string;
  message_id: string;
  author_id: string;
  action: string;
  old_content?: string;
  new_content?: string;
}

export interface MessageLogRow extends MessageLogData {
  id: string;
  created_at: string;
}

export interface GetMessageLogsOptions {
  action?: string;
  authorId?: string;
  channelId?: string;
  page?: number;
  limit?: number;
}

export class MessageLogRepository extends BaseRepository {
  async log(data: MessageLogData): Promise<MessageLogRow> {
    try {
      const { data: created, error } = await this.supabase
        .from('message_logs')
        .insert({
          guild_id: data.guild_id,
          channel_id: data.channel_id,
          message_id: data.message_id,
          author_id: data.author_id,
          action: data.action,
          old_content: data.old_content || null,
          new_content: data.new_content || null,
        })
        .select()
        .single();

      if (error) {
        logError('Failed to insert message log', error);
        throw new DatabaseQueryError(`Failed to insert message log: ${error.message}`);
      }

      return created as MessageLogRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError('Error in message log insert', error);
      throw new DatabaseQueryError('Failed to insert message log');
    }
  }

  async getByGuild(guildId: string, options: GetMessageLogsOptions = {}): Promise<{ data: MessageLogRow[]; total: number }> {
    try {
      const { action, authorId, channelId, page = 1, limit = 20 } = options;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let countQuery = this.supabase
        .from('message_logs')
        .select('*', { count: 'exact', head: true })
        .eq('guild_id', guildId);

      let dataQuery = this.supabase
        .from('message_logs')
        .select('*')
        .eq('guild_id', guildId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (action) {
        countQuery = countQuery.eq('action', action);
        dataQuery = dataQuery.eq('action', action);
      }
      if (authorId) {
        countQuery = countQuery.eq('author_id', authorId);
        dataQuery = dataQuery.eq('author_id', authorId);
      }
      if (channelId) {
        countQuery = countQuery.eq('channel_id', channelId);
        dataQuery = dataQuery.eq('channel_id', channelId);
      }

      const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

      if (countResult.error) throw countResult.error;
      if (dataResult.error) throw dataResult.error;

      return {
        data: (dataResult.data as MessageLogRow[]) || [],
        total: countResult.count ?? 0,
      };
    } catch (error) {
      logError(`Error fetching message logs for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to fetch message logs');
    }
  }

  async getByChannel(guildId: string, channelId: string, page = 1, limit = 25): Promise<{ data: MessageLogRow[]; total: number }> {
    return this.getByGuild(guildId, { channelId, page, limit });
  }

  async search(guildId: string, query: string, authorId?: string, page = 1, limit = 20): Promise<{ data: MessageLogRow[]; total: number }> {
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let countQuery = this.supabase
        .from('message_logs')
        .select('*', { count: 'exact', head: true })
        .eq('guild_id', guildId)
        .or(`old_content.ilike.%${query}%,new_content.ilike.%${query}%`);

      let dataQuery = this.supabase
        .from('message_logs')
        .select('*')
        .eq('guild_id', guildId)
        .or(`old_content.ilike.%${query}%,new_content.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (authorId) {
        countQuery = countQuery.eq('author_id', authorId);
        dataQuery = dataQuery.eq('author_id', authorId);
      }

      const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

      if (countResult.error) throw countResult.error;
      if (dataResult.error) throw dataResult.error;

      return {
        data: (dataResult.data as MessageLogRow[]) || [],
        total: countResult.count ?? 0,
      };
    } catch (error) {
      logError(`Error searching message logs for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to search message logs');
    }
  }

  async getRecent(guildId: string, limit = 25): Promise<MessageLogRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('message_logs')
        .select('*')
        .eq('guild_id', guildId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data as MessageLogRow[]) || [];
    } catch (error) {
      logError(`Error fetching recent message logs for guild ${guildId}`, error);
      throw new DatabaseQueryError('Failed to fetch recent message logs');
    }
  }
}
