import { Event } from '../structures/Event';

import Ready from './ready/Ready';
import StatsChannelUpdater from './ready/StatsChannelUpdater';
import MessageCreate from './message/MessageCreate';
import AutoResponseHandler from './message/AutoResponseHandler';
import CustomCommandHandler from './message/CustomCommandHandler';
import MessageDeleteSnipe from './message/MessageDeleteSnipe';
import GuildMemberAdd from './guild/GuildMemberAdd';
import GuildMemberRemove from './guild/GuildMemberRemove';
import InteractionCreate from './interaction/InteractionCreate';
import MemberAuditLog, { MemberRemoveAuditLog } from './audit/MemberAuditLog';
import MessageDeleteAuditLog, { MessageEditAuditLog } from './audit/MessageAuditLog';
import ReactionRoleHandler, { ReactionRoleRemoveHandler } from './reaction/ReactionRoleHandler';
import StarboardAddHandler, { StarboardRemoveHandler } from './reaction/StarboardHandler';
import AfkHandler from './message/AfkHandler';
import CountingHandler from './message/CountingHandler';
import VerificationCaptchaHandler from './interaction/VerificationCaptchaHandler';
import BanAppealHandler from './interaction/BanAppealHandler';
import LockdownChecker from './ready/LockdownChecker';

export const events: Event<keyof import('discord.js').ClientEvents>[] = [
  new Ready(),
  new StatsChannelUpdater(),
  new MessageCreate(),
  new AutoResponseHandler(),
  new CustomCommandHandler(),
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
  new StarboardAddHandler(),
  new StarboardRemoveHandler(),
  new AfkHandler(),
  new CountingHandler(),
  new VerificationCaptchaHandler(),
  new BanAppealHandler(),
  new LockdownChecker(),
];
