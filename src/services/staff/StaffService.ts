import { EmbedBuilder, Colors } from 'discord.js';
import { StaffMemberRow, StaffRole, StaffStatus } from '../../database/schema';
import { StaffRepository } from '../../database/repositories/StaffRepository';
import { logger } from '../../utils/logger';

const ROLE_HIERARCHY: Record<StaffRole, number> = {
  STAFF: 0,
  SENIOR_STAFF: 1,
  MANAGER: 2,
};

const ROLE_LABELS: Record<StaffRole, string> = {
  STAFF: 'Staff',
  SENIOR_STAFF: 'Senior Staff',
  MANAGER: 'Manager',
};

const STATUS_LABELS: Record<StaffStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  SUSPENDED: 'Suspended',
};

const STATUS_COLORS: Record<StaffStatus, number> = {
  ACTIVE: Colors.Green,
  INACTIVE: Colors.Grey,
  SUSPENDED: Colors.Red,
};

export const getRoleHierarchy = (role: StaffRole): number =>
  ROLE_HIERARCHY[role] ?? -1;

export const canManageStaff = (
  actorRole: StaffRole,
  targetRole: StaffRole
): boolean => {
  return ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[targetRole];
};

export const canPromote = (
  actorRole: StaffRole,
  targetCurrentRole: StaffRole,
  targetNewRole: StaffRole
): boolean => {
  if (actorRole !== 'MANAGER') return false;
  if (targetCurrentRole === 'MANAGER') return false;
  if (ROLE_HIERARCHY[targetNewRole] <= ROLE_HIERARCHY[targetCurrentRole]) return false;
  return true;
};

export const canDemote = (
  actorRole: StaffRole,
  targetCurrentRole: StaffRole
): boolean => {
  if (actorRole !== 'MANAGER') return false;
  if (targetCurrentRole === 'MANAGER') return false;
  if (targetCurrentRole === 'STAFF') return false;
  return true;
};

export const addStaff = async (
  guildId: string,
  targetUserId: string,
  actorUserId: string,
  actorRole: StaffRole,
  repo: StaffRepository
): Promise<{
  success: boolean;
  staff?: StaffMemberRow;
  message: string;
}> => {
  const existing = await repo.getStaff(guildId, targetUserId);
  if (existing) {
    return { success: false, message: 'User is already staff.' };
  }

  const staff = await repo.addStaff({
    guild_id: guildId,
    user_id: targetUserId,
    staff_role: 'STAFF',
    added_by: actorUserId,
  });

  if (!staff) {
    return { success: false, message: 'Failed to add staff.' };
  }

  logger.info({
    guildId,
    targetUserId,
    actorUserId,
    action: 'STAFF_ADDED',
  }, 'Staff added');

  return { success: true, staff, message: 'Staff member added.' };
};

export const removeStaff = async (
  guildId: string,
  targetUserId: string,
  actorUserId: string,
  actorRole: StaffRole,
  repo: StaffRepository
): Promise<{
  success: boolean;
  message: string;
}> => {
  const target = await repo.getStaff(guildId, targetUserId);
  if (!target) {
    return { success: false, message: 'User is not staff.' };
  }

  if (!canManageStaff(actorRole, target.staff_role)) {
    return { success: false, message: 'Insufficient permissions to remove this staff member.' };
  }

  await repo.removeStaff(guildId, targetUserId);

  logger.info({
    guildId,
    targetUserId,
    actorUserId,
    action: 'STAFF_REMOVED',
  }, 'Staff removed');

  return { success: true, message: 'Staff member removed.' };
};

export const setStaffStatus = async (
  guildId: string,
  targetUserId: string,
  status: StaffStatus,
  actorRole: StaffRole,
  repo: StaffRepository
): Promise<{
  success: boolean;
  message: string;
}> => {
  const target = await repo.getStaff(guildId, targetUserId);
  if (!target) {
    return { success: false, message: 'User is not staff.' };
  }

  if (!canManageStaff(actorRole, target.staff_role)) {
    return { success: false, message: 'Insufficient permissions to change this staff member status.' };
  }

  await repo.updateStaff(guildId, targetUserId, { status });

  logger.info({
    guildId,
    targetUserId,
    action: 'STAFF_STATUS_CHANGED',
    newStatus: status,
  }, 'Staff status changed');

  return { success: true, message: `Staff status set to ${STATUS_LABELS[status]}.` };
};

export const promoteStaff = async (
  guildId: string,
  targetUserId: string,
  newRole: StaffRole,
  actorRole: StaffRole,
  repo: StaffRepository
): Promise<{
  success: boolean;
  message: string;
}> => {
  const target = await repo.getStaff(guildId, targetUserId);
  if (!target) {
    return { success: false, message: 'User is not staff.' };
  }

  if (!canPromote(actorRole, target.staff_role, newRole)) {
    return { success: false, message: 'Cannot promote: insufficient permissions or invalid target role.' };
  }

  await repo.updateStaff(guildId, targetUserId, { staff_role: newRole });

  logger.info({
    guildId,
    targetUserId,
    action: 'STAFF_PROMOTED',
    oldRole: target.staff_role,
    newRole,
  }, 'Staff promoted');

  return { success: true, message: `Staff promoted to ${ROLE_LABELS[newRole]}.` };
};

export const demoteStaff = async (
  guildId: string,
  targetUserId: string,
  actorRole: StaffRole,
  repo: StaffRepository
): Promise<{
  success: boolean;
  message: string;
}> => {
  const target = await repo.getStaff(guildId, targetUserId);
  if (!target) {
    return { success: false, message: 'User is not staff.' };
  }

  if (!canDemote(actorRole, target.staff_role)) {
    return { success: false, message: 'Cannot demote: insufficient permissions or invalid target role.' };
  }

  const demotedRole: StaffRole = target.staff_role === 'MANAGER' ? 'SENIOR_STAFF' : 'STAFF';
  await repo.updateStaff(guildId, targetUserId, { staff_role: demotedRole });

  logger.info({
    guildId,
    targetUserId,
    action: 'STAFF_DEMOTED',
    oldRole: target.staff_role,
    newRole: demotedRole,
  }, 'Staff demoted');

  return { success: true, message: `Staff demoted to ${ROLE_LABELS[demotedRole]}.` };
};

export const getStaffInfo = (staff: StaffMemberRow): EmbedBuilder => {
  const embed = new EmbedBuilder()
    .setTitle('Staff Member')
    .setColor(STATUS_COLORS[staff.status] || Colors.Default)
    .addFields(
      { name: 'User', value: `<@${staff.user_id}>`, inline: true },
      { name: 'Role', value: ROLE_LABELS[staff.staff_role], inline: true },
      { name: 'Status', value: STATUS_LABELS[staff.status], inline: true },
    )
    .setTimestamp(new Date(staff.created_at));

  if (staff.added_by) {
    embed.addFields({ name: 'Added By', value: `<@${staff.added_by}>`, inline: true });
  }

  return embed;
};
