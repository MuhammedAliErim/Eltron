import { Event } from '../structures/Event';

import Ready from './ready/Ready';
import MessageCreate from './message/MessageCreate';
import GuildMemberAdd from './guild/GuildMemberAdd';
import GuildMemberRemove from './guild/GuildMemberRemove';
import InteractionCreate from './interaction/InteractionCreate';

export const events: Event<keyof import('discord.js').ClientEvents>[] = [
  Ready,
  MessageCreate,
  GuildMemberAdd,
  GuildMemberRemove,
  InteractionCreate,
];
