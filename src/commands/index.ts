import { Command } from '../structures/Command';

import Analytics from './analytics/Analytics';
import Antiraid from './antiraid/Antiraid';
import Application from './application/Application';
import Automod from './automod/Automod';
import ChannelWarning from './channelwarning/ChannelWarning';
import EventCommand from './event/Event';
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
  new Analytics(),
  new Antiraid(),
  new Application(),
  new Automod(),
  new ChannelWarning(),
  new EventCommand(),
  new Giveaway(),
  new Level(),
  new Ban(),
  new Kick(),
  new Timeout(),
  new Unban(),
  new Untimeout(),
  new Unwarn(),
  new Warn(),
  new Warnings(),
  new Poll(),
  new Quarantine(),
  new Reminder(),
  new AutoRole(),
  new Role(),
  new Staff(),
  new Ticket(),
  new BotInfo(),
  new Help(),
  new Ping(),
  new Verification(),
  new Verify(),
  new Welcome(),
  new Goodbye(),
];
