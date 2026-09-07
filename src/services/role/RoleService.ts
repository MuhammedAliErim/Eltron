import {
  Guild,
  GuildMember,
  Role,
  EmbedBuilder,
  Colors,
  PermissionFlagsBits,
} from 'discord.js';
import { logger } from '../../utils/logger';

export const canBotManageRole = (guild: Guild, role: Role): boolean => {
  const botMember = guild.members.me;
  if (!botMember) return false;
  return role.position < botMember.roles.highest.position;
};

export const canMemberManageRole = (member: GuildMember, role: Role): boolean => {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  return role.position < member.roles.highest.position;
};

export const validateRoleName = (name: string): string | null => {
  if (!name || name.trim().length === 0) return 'Role name cannot be empty.';
  if (name.length > 100) return 'Role name too long (max 100 characters).';
  return null;
};

export const validateHexColor = (color: string): boolean => {
  return /^#?[0-9A-Fa-f]{6}$/.test(color);
};

export const parseHexColor = (color: string): number => {
  const cleaned = color.replace('#', '');
  return parseInt(cleaned, 16);
};

export const createRoleInfoEmbed = (role: Role): EmbedBuilder => {
  return new EmbedBuilder()
    .setTitle(`Role: ${role.name}`)
    .setColor(role.color || Colors.Default)
    .addFields(
      { name: 'ID', value: role.id, inline: true },
      { name: 'Name', value: role.name, inline: true },
      { name: 'Color', value: role.hexColor, inline: true },
      { name: 'Hoist', value: role.hoist ? 'Yes' : 'No', inline: true },
      { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
      { name: 'Position', value: String(role.position), inline: true },
      { name: 'Members', value: String(role.members.size), inline: true },
      { name: 'Created', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:R>`, inline: true },
    )
    .setTimestamp();
};

export const applyAutoRole = async (
  member: GuildMember,
  roleId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    if (member.user.bot) {
      return { success: false, message: 'Cannot apply auto-role to bots.' };
    }

    const guild = member.guild;
    const role = guild.roles.cache.get(roleId);

    if (!role) {
      return { success: false, message: 'Configured auto-role not found.' };
    }

    if (!canBotManageRole(guild, role)) {
      logger.warn({
        guildId: guild.id,
        roleId,
      }, 'Auto-role: bot cannot manage configured role (hierarchy)');
      return { success: false, message: 'Bot cannot manage configured role.' };
    }

    if (member.roles.cache.has(roleId)) {
      return { success: false, message: 'Member already has this role.' };
    }

    await member.roles.add(roleId, 'Auto-role on join');

    logger.info({
      guildId: guild.id,
      userId: member.id,
      roleId,
    }, 'Auto-role applied');

    return { success: true, message: 'Auto-role applied.' };
  } catch (error) {
    logger.error({
      err: error,
      guildId: member.guild.id,
      userId: member.id,
      roleId,
    }, 'Failed to apply auto-role');
    return { success: false, message: 'Failed to apply auto-role.' };
  }
};
