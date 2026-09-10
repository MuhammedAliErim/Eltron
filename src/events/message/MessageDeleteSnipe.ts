import { Events, Message } from 'discord.js';
import { Event } from '../../structures/Event';
import { EltronClient } from '../../structures/EltronClient';
import { recordSnipe } from '../../commands/utility/Snipe';

export default class MessageDeleteSnipeEvent extends Event<'messageDelete'> {
  name = Events.MessageDelete as const;

  async execute(client: EltronClient, message: Message): Promise<void> {
    if (!message || message.author.bot || !message.content) return;

    recordSnipe(message.channelId, {
      content: message.content,
      author: message.author.tag,
      authorAvatar: message.author.displayAvatarURL(),
      timestamp: message.createdTimestamp,
      deletedAt: Date.now(),
    });
  }
}
