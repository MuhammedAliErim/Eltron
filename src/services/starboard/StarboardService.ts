import {
  EmbedBuilder,
  Colors,
  type TextChannel,
  type MessageReaction,
  type User,
  type PartialMessageReaction,
} from 'discord.js';
import { StarboardRepository } from '../../database/repositories/StarboardRepository';
import { logger } from '../../utils/logger';

const repo = new StarboardRepository();

function getEmojiName(reaction: MessageReaction | PartialMessageReaction): string {
  if (reaction.emoji.id) {
    return `${reaction.emoji.name}:${reaction.emoji.id}`;
  }
  return reaction.emoji.name || '';
}

export async function handleReactionAdd(
  reaction: MessageReaction | PartialMessageReaction,
  user: User
): Promise<void> {
  try {
    if (user.bot) return;
    if (!reaction.message.guild) return;
    if (!reaction.message.channel.isTextBased()) return;

    const guild = reaction.message.guild;
    const config = await repo.getConfig(guild.id);
    if (!config || !config.enabled) return;

    const emojiName = getEmojiName(reaction);
    const configEmoji = config.emoji || '⭐';
    let configEmojiName = configEmoji;
    if (configEmoji.includes(':')) {
      const parts = configEmoji.replace(/[<>]/g, '').split(':');
      configEmojiName = parts[1] || parts[0];
    }

    if (emojiName !== configEmojiName && reaction.emoji.name !== configEmoji) return;
    if (!config.self_star && user.id === reaction.message.author?.id) return;

    const count = reaction.count || 0;
    const threshold = config.threshold || 5;

    if (count >= threshold) {
      const starboardChannel = await guild.channels.fetch(config.channel_id).catch(() => null);
      if (!starboardChannel || !starboardChannel.isTextBased()) return;

      const entry = await repo.getEntry(reaction.message.id);

      let messageContent = reaction.message.content || '';
      if (reaction.message.embeds.length > 0) {
        messageContent += '\n[Embeds attached]';
      }
      if (reaction.message.attachments.size > 0) {
        messageContent += '\n[Attachments attached]';
      }

      const embed = new EmbedBuilder()
        .setAuthor({
          name: reaction.message.author?.tag || 'Unknown',
          iconURL: reaction.message.author?.displayAvatarURL(),
        })
        .setDescription(messageContent.substring(0, 4000))
        .setColor(Colors.Gold)
        .addFields({ name: 'Stars', value: `${config.emoji} ${count}`, inline: true })
        .setFooter({ text: `#${(reaction.message.channel as TextChannel).name}` })
        .setTimestamp(reaction.message.createdAt);

      if (entry?.starboard_message_id) {
        try {
          const starboardMessage = await starboardChannel.messages.fetch(entry.starboard_message_id);
          await starboardMessage.edit({ embeds: [embed] });
          await repo.upsertEntry({
            ...entry,
            star_count: count,
          });
        } catch {
          const sent = await starboardChannel.send({ embeds: [embed] });
          await repo.upsertEntry({
            guild_id: guild.id,
            original_channel_id: reaction.message.channel.id,
            original_message_id: reaction.message.id,
            starboard_message_id: sent.id,
            author_id: reaction.message.author?.id || '',
            content: messageContent.substring(0, 2000),
            star_count: count,
          });
        }
      } else {
        const sent = await starboardChannel.send({ embeds: [embed] });
        await repo.upsertEntry({
          guild_id: guild.id,
          original_channel_id: reaction.message.channel.id,
          original_message_id: reaction.message.id,
          starboard_message_id: sent.id,
          author_id: reaction.message.author?.id || '',
          content: messageContent.substring(0, 2000),
          star_count: count,
        });
      }
    } else {
      const entry = await repo.getEntry(reaction.message.id);
      if (entry?.starboard_message_id) {
        try {
          const starboardChannel = await guild.channels.fetch(config.channel_id).catch(() => null);
          if (starboardChannel && starboardChannel.isTextBased()) {
            const starboardMessage = await starboardChannel.messages.fetch(entry.starboard_message_id);
            await starboardMessage.delete().catch(() => {});
          }
        } catch {
          // message may already be deleted
        }
        await repo.deleteEntry(reaction.message.id);
      }
    }
  } catch (error) {
    logger.error({ err: error }, 'Error in starboard reaction add handler');
  }
}

export async function handleReactionRemove(
  reaction: MessageReaction | PartialMessageReaction
): Promise<void> {
  try {
    if (!reaction.message.guild) return;
    if (!reaction.message.channel.isTextBased()) return;

    const guild = reaction.message.guild;
    const config = await repo.getConfig(guild.id);
    if (!config || !config.enabled) return;

    const emojiName = getEmojiName(reaction);
    const configEmoji = config.emoji || '⭐';
    let configEmojiName = configEmoji;
    if (configEmoji.includes(':')) {
      const parts = configEmoji.replace(/[<>]/g, '').split(':');
      configEmojiName = parts[1] || parts[0];
    }

    if (emojiName !== configEmojiName && reaction.emoji.name !== configEmoji) return;

    const entry = await repo.getEntry(reaction.message.id);
    if (!entry?.starboard_message_id) return;

    const count = reaction.count || 0;
    const threshold = config.threshold || 5;

    if (count >= threshold) {
      const starboardChannel = await guild.channels.fetch(config.channel_id).catch(() => null);
      if (!starboardChannel || !starboardChannel.isTextBased()) return;

      let messageContent = reaction.message.content || '';
      if (reaction.message.embeds.length > 0) {
        messageContent += '\n[Embeds attached]';
      }
      if (reaction.message.attachments.size > 0) {
        messageContent += '\n[Attachments attached]';
      }

      const embed = new EmbedBuilder()
        .setAuthor({
          name: reaction.message.author?.tag || 'Unknown',
          iconURL: reaction.message.author?.displayAvatarURL(),
        })
        .setDescription(messageContent.substring(0, 4000))
        .setColor(Colors.Gold)
        .addFields({ name: 'Stars', value: `${config.emoji} ${count}`, inline: true })
        .setFooter({ text: `#${(reaction.message.channel as TextChannel).name}` })
        .setTimestamp(reaction.message.createdAt);

      try {
        const starboardMessage = await starboardChannel.messages.fetch(entry.starboard_message_id);
        await starboardMessage.edit({ embeds: [embed] });
      } catch {
        // message may have been deleted
      }

      await repo.upsertEntry({
        ...entry,
        star_count: count,
      });
    } else {
      try {
        const starboardChannel = await guild.channels.fetch(config.channel_id).catch(() => null);
        if (starboardChannel && starboardChannel.isTextBased()) {
          const starboardMessage = await starboardChannel.messages.fetch(entry.starboard_message_id);
          await starboardMessage.delete().catch(() => {});
        }
      } catch {
        // message may already be deleted
      }
      await repo.deleteEntry(reaction.message.id);
    }
  } catch (error) {
    logger.error({ err: error }, 'Error in starboard reaction remove handler');
  }
}
