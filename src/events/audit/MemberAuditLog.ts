import { GuildMember } from 'discord.js';
import { Event } from '../../structures/Event';
import { EltronClient } from '../../structures/EltronClient';
import { AuditLogService } from '../../services/audit-log/AuditLogService';
import { logger } from '../../utils/logger';

export default class MemberAuditLog extends Event<'guildMemberAdd'> {
  name = 'guildMemberAdd' as const;

  async execute(client: EltronClient, member: GuildMember): Promise<void> {
    if (member.user.bot) return;
    if (!member.guild) return;

    try {
      await AuditLogService.logMemberJoin(member.guild.id, member.id);
    } catch (error) {
      logger.error({ err: error, guildId: member.guild.id, userId: member.id }, 'Failed to log member join audit');
    }
  }
}

export class MemberRemoveAuditLog extends Event<'guildMemberRemove'> {
  name = 'guildMemberRemove' as const;

  async execute(client: EltronClient, member: GuildMember): Promise<void> {
    if (member.user.bot) return;
    if (!member.guild) return;

    try {
      await AuditLogService.logMemberLeave(member.guild.id, member.id);
    } catch (error) {
      logger.error({ err: error, guildId: member.guild.id, userId: member.id }, 'Failed to log member leave audit');
    }
  }
}
