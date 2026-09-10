import { Guild, GuildMember, TextChannel, EmbedBuilder, Colors } from 'discord.js';
import { LevelConfigRepository, LevelingConfig } from '../../database/repositories/LevelConfigRepository';
import { logger } from '../../utils/logger';

const configRepo = new LevelConfigRepository();

function buildProgressBar(progress: number): string {
  const filled = Math.floor(progress * 20);
  return `${'█'.repeat(filled)}${'░'.repeat(20 - filled)}`;
}

function formatMessage(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

export async function processLevelUp(
  guild: Guild,
  member: GuildMember,
  oldLevel: number,
  newLevel: number,
  channel: TextChannel
): Promise<void> {
  try {
    const config = await configRepo.getConfig(guild.id);

    if (!config.enabled) return;

    const targetChannelId = config.levelUpChannel || channel.id;
    const targetChannel = guild.channels.cache.get(targetChannelId) as TextChannel | undefined;

    if (!targetChannel) {
      logger.warn({ guildId: guild.id, channelId: targetChannelId }, 'Level-up channel not found');
      return;
    }

    const message = formatMessage(config.levelUpMessage, {
      user: `<@${member.id}>`,
      level: String(newLevel),
      oldLevel: String(oldLevel),
      username: member.user.username,
      server: guild.name,
    });

    if (config.levelUpEmbed) {
      const progress = 0;
      const embed = new EmbedBuilder()
        .setTitle('Level Up!')
        .setDescription(message)
        .setColor(Colors.Gold)
        .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
        .addFields(
          { name: 'Level', value: `${oldLevel} → ${newLevel}`, inline: true },
          { name: 'Progress', value: buildProgressBar(progress), inline: false }
        )
        .setTimestamp();

      await targetChannel.send({ embeds: [embed] }).catch((err) => {
        logger.error({ err, guildId: guild.id }, 'Failed to send level-up embed');
      });
    } else {
      await targetChannel.send({ content: message }).catch((err) => {
        logger.error({ err, guildId: guild.id }, 'Failed to send level-up message');
      });
    }

    const reward = await configRepo.getRoleRewardForLevel(guild.id, newLevel);
    if (reward) {
      try {
        const role = guild.roles.cache.get(reward.role_id);
        if (role) {
          await member.roles.add(role).catch((err) => {
            logger.error({ err, guildId: guild.id, roleId: reward.role_id }, 'Failed to assign level reward role');
          });
        } else {
          logger.warn({ guildId: guild.id, roleId: reward.role_id }, 'Level reward role not found');
        }
      } catch (err) {
        logger.error({ err, guildId: guild.id }, 'Error assigning level reward role');
      }
    }
  } catch (error) {
    logger.error({ err: error, guildId: guild.id }, 'Error processing level up');
  }
}
