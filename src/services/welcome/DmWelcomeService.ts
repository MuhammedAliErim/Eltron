import { GuildMember } from 'discord.js';
import { WelcomeConfigRow } from '../../database/schema';
import { logger } from '../../utils/logger';

const replaceVariables = (
  template: string,
  member: GuildMember
): string => {
  return template
    .replace(/{user}/g, `<@${member.id}>`)
    .replace(/{username}/g, member.user.username)
    .replace(/{server}/g, member.guild.name)
    .replace(/{membercount}/g, String(member.guild.memberCount))
    .replace(/{memberCount}/g, String(member.guild.memberCount));
};

export const sendDmWelcome = async (
  member: GuildMember,
  config: WelcomeConfigRow
): Promise<void> => {
  if (!config.dm_enabled) return;
  if (!config.dm_message) return;
  if (member.user.bot) return;

  try {
    const dmChannel = await member.createDM();
    const message = replaceVariables(config.dm_message, member);
    await dmChannel.send({ content: message });

    logger.info({
      guildId: member.guild.id,
      userId: member.id,
    }, 'DM welcome message sent');
  } catch (error) {
    logger.warn({
      err: error,
      guildId: member.guild.id,
      userId: member.id,
    }, 'Failed to send DM welcome message (user may have DMs disabled)');
  }
};
