import { Event } from '../structures/Event';

import Ready from './ready/Ready';
import MessageCreate from './message/MessageCreate';
import AutoResponseHandler from './message/AutoResponseHandler';
import MessageDeleteSnipe from './message/MessageDeleteSnipe';
import GuildMemberAdd from './guild/GuildMemberAdd';
import GuildMemberRemove from './guild/GuildMemberRemove';
import InteractionCreate from './interaction/InteractionCreate';
import MemberAuditLog, { MemberRemoveAuditLog } from './audit/MemberAuditLog';
import MessageDeleteAuditLog, { MessageEditAuditLog } from './audit/MessageAuditLog';
import ReactionRoleHandler, { ReactionRoleRemoveHandler } from './reaction/ReactionRoleHandler';

export const events: Event<keyof import('discord.js').ClientEvents>[] = [
  new Ready(),
  new MessageCreate(),
  new AutoResponseHandler(),
  new MessageDeleteSnipe(),
  new GuildMemberAdd(),
  new GuildMemberRemove(),
  new InteractionCreate(),
  new MemberAuditLog(),
  new MemberRemoveAuditLog(),
  new MessageDeleteAuditLog(),
  new MessageEditAuditLog(),
  new ReactionRoleHandler(),
  new ReactionRoleRemoveHandler(),
];
