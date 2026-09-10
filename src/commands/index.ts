import { Command } from '../structures/Command';

import Analytics from './analytics/Analytics';
import Antiraid from './antiraid/Antiraid';
import Application from './application/Application';
import Automod from './automod/Automod';
import AutoResponse from './automod/AutoResponse';
import ChannelWarning from './channelwarning/ChannelWarning';
import EventCommand from './event/Event';
import Giveaway from './giveaway/Giveaway';
import Level from './level/Level';
import Ban from './moderation/Ban';
import Kick from './moderation/Kick';
import Purge from './moderation/Purge';
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
import ReactionRole from './role/ReactionRole';
import Role from './role/Role';
import RoleInfo from './role/RoleInfo';
import Staff from './staff/Staff';
import Ticket from './ticket/Ticket';
import Avatar from './utility/Avatar';
import Banner from './utility/Banner';
import BotInfo from './utility/BotInfo';
import Calc from './utility/Calc';
import Color from './utility/Color';
import Embed from './utility/Embed';
import Help from './utility/Help';
import Ping from './utility/Ping';
import ServerInfo from './utility/ServerInfo';
import Snipe from './utility/Snipe';
import Stats from './utility/Stats';
import Tag from './utility/Tag';
import Task from './utility/Task';
import Uptime from './utility/Uptime';
import UserInfo from './utility/UserInfo';
import Verification from './verification/Verification';
import Verify from './verification/Verify';
import Welcome from './welcome/Welcome';
import Goodbye from './welcome/Goodbye';

export const commands: Command[] = [
  new Analytics(),
  new Antiraid(),
  new Application(),
  new Automod(),
  new AutoResponse(),
  new ChannelWarning(),
  new EventCommand(),
  new Giveaway(),
  new Level(),
  new Ban(),
  new Kick(),
  new Purge(),
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
  new ReactionRole(),
  new Role(),
  new RoleInfo(),
  new Staff(),
  new Ticket(),
  new Avatar(),
  new Banner(),
  new BotInfo(),
  new Calc(),
  new Color(),
  new Embed(),
  new Help(),
  new Ping(),
  new ServerInfo(),
  new Snipe(),
  new Stats(),
  new Tag(),
  new Task(),
  new Uptime(),
  new UserInfo(),
  new Verification(),
  new Verify(),
  new Welcome(),
  new Goodbye(),
];
