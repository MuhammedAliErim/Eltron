import { Command } from '../structures/Command';

import Analytics from './analytics/Analytics';
import Antiraid from './antiraid/Antiraid';
import Application from './application/Application';
import Automod from './automod/Automod';
import ChannelWarning from './channelwarning/ChannelWarning';
import Event from './event/Event';
import Giveaway from './giveaway/Giveaway';
import Level from './level/Level';
import Ban from './moderation/Ban';
import Kick from './moderation/Kick';
import Timeout from './moderation/Timeout';
import Unban from './moderation/Unban';
import Untimeout from './moderation/Untimeout';
import Unwarn from './moderation/Unwarn';
import Warn from './moderation/Warn';
import Warnings from './moderation/Warnings';
import Poll from './poll/Poll';
import Quarantine from './quarantine/Quarantine';
import Reminder from './reminder/Reminder';
import AutoRole from './role/AutoRole';
import Role from './role/Role';
import Staff from './staff/Staff';
import Ticket from './ticket/Ticket';
import BotInfo from './utility/BotInfo';
import Help from './utility/Help';
import Ping from './utility/Ping';
import Verification from './verification/Verification';
import Verify from './verification/Verify';
import Welcome from './welcome/Welcome';
import Goodbye from './welcome/Goodbye';

export const commands: Command[] = [
  Analytics,
  Antiraid,
  Application,
  Automod,
  ChannelWarning,
  Event,
  Giveaway,
  Level,
  Ban,
  Kick,
  Timeout,
  Unban,
  Untimeout,
  Unwarn,
  Warn,
  Warnings,
  Poll,
  Quarantine,
  Reminder,
  AutoRole,
  Role,
  Staff,
  Ticket,
  BotInfo,
  Help,
  Ping,
  Verification,
  Verify,
  Welcome,
  Goodbye,
];
