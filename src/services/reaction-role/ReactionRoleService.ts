import {
  EmbedBuilder,
  Colors,
  type Guild,
  type TextChannel,
  type MessageReaction,
  type User,
} from 'discord.js';
import { ReactionRoleRepository } from '../../database/repositories/ReactionRoleRepository';
import { ReactionRoleRow, ReactionRoleCreate } from '../../database/schema';
import { logger } from '../../utils/logger';

const reactionRoleRepo = new ReactionRoleRepository();

export async function createReactionRole(
  guild: Guild,
  channelId: string,
  title: string,
  description: string | undefined,
  color: string | undefined,
  emoji: string,
  roleId: string,
  createdBy: string
): Promise<ReactionRoleRow> {
  const channel = guild.channels.cache.get(channelId) as TextChannel | undefined;
  if (!channel) {
    throw new Error('Channel not found');
  }

  const role = guild.roles.cache.get(roleId);
  if (!role) {
    throw new Error('Role not found');
  }

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description || `React with ${emoji} to get the ${role.name} role`)
    .setColor(color ? parseInt(color.replace('#', ''), 16) : Colors.Blurple);

  const message = await channel.send({ embeds: [embed] });
  await message.react(emoji);

  const data: ReactionRoleCreate = {
    guild_id: guild.id,
    channel_id: channelId,
    message_id: message.id,
    title,
    description,
    color,
    emoji,
    role_id: roleId,
    created_by: createdBy,
  };

  const reactionRole = await reactionRoleRepo.create(data);

  logger.info({
    guildId: guild.id,
    reactionRoleId: reactionRole.id,
    title,
    emoji,
    roleId,
  }, 'Reaction role created');

  return reactionRole;
}

export async function removeReactionRole(
  guild: Guild,
  id: string
): Promise<boolean> {
  const reactionRole = await reactionRoleRepo.getById(id);

  if (!reactionRole || reactionRole.guild_id !== guild.id) {
    throw new Error('Reaction role not found');
  }

  try {
    const channel = guild.channels.cache.get(reactionRole.channel_id) as TextChannel | undefined;
    if (channel) {
      const message = await channel.messages.fetch(reactionRole.message_id).catch(() => null);
      if (message) {
        await message.delete().catch(() => {});
      }
    }
  } catch (error) {
    logger.warn({ err: error, id }, 'Failed to delete reaction role message');
  }

  const deleted = await reactionRoleRepo.delete(id);

  logger.info({
    guildId: guild.id,
    reactionRoleId: id,
  }, 'Reaction role removed');

  return deleted;
}

export async function handleReactionAdd(
  reaction: MessageReaction,
  user: User
): Promise<void> {
  if (user.bot) return;
  if (!reaction.message.guild) return;

  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      logger.warn({ err: error }, 'Failed to fetch partial reaction');
      return;
    }
  }

  if (!reaction.message.guild) return;

  const emoji = reaction.emoji.name || reaction.emoji.id || '';
  const messageId = reaction.message.id;

  const reactionRole = await reactionRoleRepo.getByMessageAndEmoji(messageId, emoji);

  if (!reactionRole) return;

  if (reactionRole.max_uses > 0 && reactionRole.current_uses >= reactionRole.max_uses) {
    return;
  }

  try {
    const member = await reaction.message.guild.members.fetch(user.id);
    if (!member) return;

    const role = reaction.message.guild.roles.cache.get(reactionRole.role_id);
    if (!role) return;

    if (member.roles.cache.has(role.id)) return;

    await member.roles.add(role, 'Reaction role');

    await reactionRoleRepo.incrementUses(reactionRole.id);

    logger.info({
      guildId: reaction.message.guild.id,
      userId: user.id,
      roleId: role.id,
      reactionRoleId: reactionRole.id,
    }, 'Reaction role added to user');
  } catch (error) {
    logger.error({ err: error, userId: user.id, guildId: reaction.message.guild.id }, 'Failed to add reaction role');
  }
}

export async function handleReactionRemove(
  reaction: MessageReaction,
  user: User
): Promise<void> {
  if (user.bot) return;
  if (!reaction.message.guild) return;

  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      logger.warn({ err: error }, 'Failed to fetch partial reaction');
      return;
    }
  }

  if (!reaction.message.guild) return;

  const emoji = reaction.emoji.name || reaction.emoji.id || '';
  const messageId = reaction.message.id;

  const reactionRole = await reactionRoleRepo.getByMessageAndEmoji(messageId, emoji);

  if (!reactionRole) return;

  try {
    const member = await reaction.message.guild.members.fetch(user.id);
    if (!member) return;

    const role = reaction.message.guild.roles.cache.get(reactionRole.role_id);
    if (!role) return;

    if (!member.roles.cache.has(role.id)) return;

    await member.roles.remove(role, 'Reaction role removed');

    await reactionRoleRepo.decrementUses(reactionRole.id);

    logger.info({
      guildId: reaction.message.guild.id,
      userId: user.id,
      roleId: role.id,
      reactionRoleId: reactionRole.id,
    }, 'Reaction role removed from user');
  } catch (error) {
    logger.error({ err: error, userId: user.id, guildId: reaction.message.guild.id }, 'Failed to remove reaction role');
  }
}

export async function listReactionRoles(guildId: string): Promise<ReactionRoleRow[]> {
  return reactionRoleRepo.getByGuild(guildId);
}

export async function getReactionRoleById(id: string): Promise<ReactionRoleRow | null> {
  return reactionRoleRepo.getById(id);
}
