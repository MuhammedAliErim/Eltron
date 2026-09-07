import { GuildMember, TextChannel, EmbedBuilder } from 'discord.js';
import { WelcomeConfigRow } from '../../database/schema';
import { logger } from '../../utils/logger';

export const replaceVariables = (
  template: string,
  member: GuildMember
): string => {
  return template
    .replace(/{user}/g, `<@${member.id}>`)
    .replace(/{username}/g, member.user.username)
    .replace(/{server}/g, member.guild.name)
    .replace(/{memberCount}/g, String(member.guild.memberCount));
};

const hexToDecimal = (hex: string): number => {
  const cleaned = hex.replace('#', '');
  return parseInt(cleaned, 16);
};

export const sendWelcome = async (
  member: GuildMember,
  config: WelcomeConfigRow
): Promise<void> => {
  if (!config.welcome_enabled) return;
  if (!config.welcome_channel_id) return;
  if (member.user.bot) return;

  try {
    const channel = member.guild.channels.cache.get(config.welcome_channel_id);
    if (!channel || !('send' in channel)) return;

    const textChannel = channel as TextChannel;

    if (config.welcome_use_embed) {
      const description = replaceVariables(config.welcome_embed_description, member);
      const title = replaceVariables(config.welcome_embed_title, member);
      const color = hexToDecimal(config.welcome_embed_color || '#00FF00');

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(isNaN(color) ? 0x00ff00 : color)
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setTimestamp();

      await textChannel.send({ embeds: [embed] });
    } else {
      const message = replaceVariables(config.welcome_message, member);
      await textChannel.send({ content: message });
    }

    logger.info({
      guildId: member.guild.id,
      userId: member.id,
      channelId: config.welcome_channel_id,
    }, 'Welcome message sent');
  } catch (error) {
    logger.error({
      err: error,
      guildId: member.guild.id,
      userId: member.id,
    }, 'Failed to send welcome message');
  }
};

export const sendGoodbye = async (
  member: GuildMember,
  config: WelcomeConfigRow
): Promise<void> => {
  if (!config.goodbye_enabled) return;
  if (!config.goodbye_channel_id) return;
  if (member.user.bot) return;

  try {
    const channel = member.guild.channels.cache.get(config.goodbye_channel_id);
    if (!channel || !('send' in channel)) return;

    const textChannel = channel as TextChannel;

    if (config.goodbye_use_embed) {
      const description = replaceVariables(config.goodbye_embed_description, member);
      const title = replaceVariables(config.goodbye_embed_title, member);
      const color = hexToDecimal(config.goodbye_embed_color || '#FF0000');

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(isNaN(color) ? 0xff0000 : color)
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setTimestamp();

      await textChannel.send({ embeds: [embed] });
    } else {
      const message = replaceVariables(config.goodbye_message, member);
      await textChannel.send({ content: message });
    }

    logger.info({
      guildId: member.guild.id,
      userId: member.id,
      channelId: config.goodbye_channel_id,
    }, 'Goodbye message sent');
  } catch (error) {
    logger.error({
      err: error,
      guildId: member.guild.id,
      userId: member.id,
    }, 'Failed to send goodbye message');
  }
};

export const validateChannelAccess = (
  guild: GuildMember['guild'],
  channelId: string
): boolean => {
  if (!channelId) return false;
  const channel = guild.channels.cache.get(channelId);
  return !!channel && 'send' in channel;
};

export const getStatusDescription = (config: WelcomeConfigRow): {
  welcome: string;
  goodbye: string;
} => {
  const welcomeStatus = config.welcome_enabled ? 'Enabled' : 'Disabled';
  const welcomeChannel = config.welcome_channel_id
    ? `<#${config.welcome_channel_id}>`
    : 'Not set';
  const welcomeMsgType = config.welcome_use_embed ? 'Embed' : 'Text';

  const goodbyeStatus = config.goodbye_enabled ? 'Enabled' : 'Disabled';
  const goodbyeChannel = config.goodbye_channel_id
    ? `<#${config.goodbye_channel_id}>`
    : 'Not set';
  const goodbyeMsgType = config.goodbye_use_embed ? 'Embed' : 'Text';

  return {
    welcome: `**Welcome:** ${welcomeStatus} | Channel: ${welcomeChannel} | Type: ${welcomeMsgType}`,
    goodbye: `**Goodbye:** ${goodbyeStatus} | Channel: ${goodbyeChannel} | Type: ${goodbyeMsgType}`,
  };
};
