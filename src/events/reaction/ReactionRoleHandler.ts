import { type MessageReaction, type User } from 'discord.js';
import { Event } from '../../structures/Event';
import { EltronClient } from '../../structures/EltronClient';
import {
  handleReactionAdd,
  handleReactionRemove,
} from '../../services/reaction-role/ReactionRoleService';

export default class ReactionRoleHandler extends Event<'messageReactionAdd'> {
  name = 'messageReactionAdd' as const;

  async execute(client: EltronClient, reaction: MessageReaction, user: User): Promise<void> {
    await handleReactionAdd(reaction, user);
  }
}

export class ReactionRoleRemoveHandler extends Event<'messageReactionRemove'> {
  name = 'messageReactionRemove' as const;

  async execute(client: EltronClient, reaction: MessageReaction, user: User): Promise<void> {
    await handleReactionRemove(reaction, user);
  }
}
