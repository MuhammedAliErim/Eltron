import { AuditLogRepository, AuditLogData } from '../../database/repositories/AuditLogRepository';
import { logError } from '../../utils/logger';

const repo = new AuditLogRepository();

const formatAction = (action: string): string => {
  return action
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

export class AuditLogService {
  static async logModeration(
    guildId: string,
    action: string,
    moderatorId: string,
    targetId: string,
    reason: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    try {
      await repo.log({
        guild_id: guildId,
        action: `MODERATION_${action}`,
        moderator_id: moderatorId,
        target_id: targetId,
        target_type: 'user',
        reason,
        details,
      });
    } catch (error) {
      logError('Failed to log moderation action', error);
    }
  }

  static async logConfigChange(
    guildId: string,
    action: string,
    moderatorId: string,
    details: Record<string, unknown>
  ): Promise<void> {
    try {
      await repo.log({
        guild_id: guildId,
        action: `CONFIG_${action}`,
        moderator_id: moderatorId,
        details,
      });
    } catch (error) {
      logError('Failed to log config change', error);
    }
  }

  static async logMemberJoin(guildId: string, userId: string): Promise<void> {
    try {
      await repo.log({
        guild_id: guildId,
        action: 'MEMBER_JOIN',
        target_id: userId,
        target_type: 'user',
      });
    } catch (error) {
      logError('Failed to log member join', error);
    }
  }

  static async logMemberLeave(guildId: string, userId: string): Promise<void> {
    try {
      await repo.log({
        guild_id: guildId,
        action: 'MEMBER_LEAVE',
        target_id: userId,
        target_type: 'user',
      });
    } catch (error) {
      logError('Failed to log member leave', error);
    }
  }

  static async logMessageDelete(
    guildId: string,
    channelId: string,
    authorId: string,
    content: string,
    moderatorId?: string
  ): Promise<void> {
    try {
      await repo.log({
        guild_id: guildId,
        action: moderatorId ? 'MODERATION_MESSAGE_DELETE' : 'MESSAGE_DELETE',
        moderator_id: moderatorId,
        target_id: authorId,
        target_type: 'message',
        channel_id: channelId,
        details: { content: content.substring(0, 2000) },
      });
    } catch (error) {
      logError('Failed to log message delete', error);
    }
  }

  static async logMessageEdit(
    guildId: string,
    channelId: string,
    authorId: string,
    oldContent: string,
    newContent: string
  ): Promise<void> {
    try {
      await repo.log({
        guild_id: guildId,
        action: 'MESSAGE_EDIT',
        target_id: authorId,
        target_type: 'message',
        channel_id: channelId,
        details: {
          old_content: oldContent.substring(0, 2000),
          new_content: newContent.substring(0, 2000),
        },
      });
    } catch (error) {
      logError('Failed to log message edit', error);
    }
  }

  static async logRoleChange(
    guildId: string,
    moderatorId: string,
    targetId: string,
    action: string,
    roleName: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    try {
      await repo.log({
        guild_id: guildId,
        action: `ROLE_${action}`,
        moderator_id: moderatorId,
        target_id: targetId,
        target_type: 'role',
        details: { role_name: roleName, ...details },
      });
    } catch (error) {
      logError('Failed to log role change', error);
    }
  }

  static async logChannelChange(
    guildId: string,
    moderatorId: string,
    channelId: string,
    action: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    try {
      await repo.log({
        guild_id: guildId,
        action: `CHANNEL_${action}`,
        moderator_id: moderatorId,
        target_id: channelId,
        target_type: 'channel',
        channel_id: channelId,
        details,
      });
    } catch (error) {
      logError('Failed to log channel change', error);
    }
  }

  static async logAutoMod(
    guildId: string,
    action: string,
    targetId: string,
    details: Record<string, unknown>
  ): Promise<void> {
    try {
      await repo.log({
        guild_id: guildId,
        action: `AUTOMOD_${action}`,
        target_id: targetId,
        target_type: 'user',
        details,
      });
    } catch (error) {
      logError('Failed to log automod action', error);
    }
  }
}
