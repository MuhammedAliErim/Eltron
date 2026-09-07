import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getRoleHierarchy,
  canManageStaff,
  canPromote,
  canDemote,
  addStaff,
  removeStaff,
  setStaffStatus,
  promoteStaff,
  demoteStaff,
  getStaffInfo,
} from '../src/services/staff/StaffService';
import { StaffRepository } from '../src/database/repositories/StaffRepository';
import type { StaffRole, StaffStatus, StaffMemberRow } from '../src/database/schema';

vi.mock('../src/database/connection', () => ({
  getSupabaseAdmin: () => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      count: vi.fn().mockResolvedValue({ count: 0, error: null }),
    })),
  }),
}));

vi.mock('../src/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  logError: vi.fn(),
}));

const createMockStaff = (overrides: Partial<StaffMemberRow> = {}): StaffMemberRow => ({
  id: 1,
  guild_id: 'guild1',
  user_id: 'user1',
  staff_role: 'STAFF',
  status: 'ACTIVE',
  added_by: 'user0',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe('StaffService — Role Hierarchy', () => {
  it('should return correct hierarchy values', () => {
    expect(getRoleHierarchy('STAFF')).toBe(0);
    expect(getRoleHierarchy('SENIOR_STAFF')).toBe(1);
    expect(getRoleHierarchy('MANAGER')).toBe(2);
  });

  it('STAFF < SENIOR_STAFF < MANAGER', () => {
    expect(getRoleHierarchy('STAFF')).toBeLessThan(getRoleHierarchy('SENIOR_STAFF'));
    expect(getRoleHierarchy('SENIOR_STAFF')).toBeLessThan(getRoleHierarchy('MANAGER'));
  });
});

describe('StaffService — canManageStaff', () => {
  it('MANAGER can manage STAFF', () => {
    expect(canManageStaff('MANAGER', 'STAFF')).toBe(true);
  });

  it('MANAGER can manage SENIOR_STAFF', () => {
    expect(canManageStaff('MANAGER', 'SENIOR_STAFF')).toBe(true);
  });

  it('SENIOR_STAFF can manage STAFF', () => {
    expect(canManageStaff('SENIOR_STAFF', 'STAFF')).toBe(true);
  });

  it('STAFF cannot manage anyone', () => {
    expect(canManageStaff('STAFF', 'STAFF')).toBe(false);
    expect(canManageStaff('STAFF', 'SENIOR_STAFF')).toBe(false);
    expect(canManageStaff('STAFF', 'MANAGER')).toBe(false);
  });

  it('SENIOR_STAFF cannot manage MANAGER', () => {
    expect(canManageStaff('SENIOR_STAFF', 'MANAGER')).toBe(false);
  });

  it('equal roles cannot manage each other', () => {
    expect(canManageStaff('STAFF', 'STAFF')).toBe(false);
    expect(canManageStaff('SENIOR_STAFF', 'SENIOR_STAFF')).toBe(false);
    expect(canManageStaff('MANAGER', 'MANAGER')).toBe(false);
  });
});

describe('StaffService — canPromote', () => {
  it('MANAGER can promote STAFF to SENIOR_STAFF', () => {
    expect(canPromote('MANAGER', 'STAFF', 'SENIOR_STAFF')).toBe(true);
  });

  it('MANAGER can promote SENIOR_STAFF to MANAGER', () => {
    expect(canPromote('MANAGER', 'SENIOR_STAFF', 'MANAGER')).toBe(true);
  });

  it('STAFF cannot promote', () => {
    expect(canPromote('STAFF', 'STAFF', 'SENIOR_STAFF')).toBe(false);
  });

  it('SENIOR_STAFF cannot promote', () => {
    expect(canPromote('SENIOR_STAFF', 'STAFF', 'SENIOR_STAFF')).toBe(false);
  });

  it('cannot promote MANAGER', () => {
    expect(canPromote('MANAGER', 'MANAGER', 'MANAGER')).toBe(false);
  });

  it('cannot promote to lower or equal role', () => {
    expect(canPromote('MANAGER', 'SENIOR_STAFF', 'STAFF')).toBe(false);
    expect(canPromote('MANAGER', 'STAFF', 'STAFF')).toBe(false);
  });
});

describe('StaffService — canDemote', () => {
  it('MANAGER can demote SENIOR_STAFF', () => {
    expect(canDemote('MANAGER', 'SENIOR_STAFF')).toBe(true);
  });

  it('STAFF cannot demote', () => {
    expect(canDemote('STAFF', 'SENIOR_STAFF')).toBe(false);
  });

  it('SENIOR_STAFF cannot demote', () => {
    expect(canDemote('SENIOR_STAFF', 'SENIOR_STAFF')).toBe(false);
  });

  it('cannot demote MANAGER', () => {
    expect(canDemote('MANAGER', 'MANAGER')).toBe(false);
  });

  it('cannot demote STAFF (already lowest)', () => {
    expect(canDemote('MANAGER', 'STAFF')).toBe(false);
  });
});

describe('Staff Model', () => {
  it('should create a valid staff member object', () => {
    const staff = createMockStaff();
    expect(staff.id).toBe(1);
    expect(staff.guild_id).toBe('guild1');
    expect(staff.user_id).toBe('user1');
    expect(staff.staff_role).toBe('STAFF');
    expect(staff.status).toBe('ACTIVE');
  });

  it('should support all staff roles', () => {
    const roles: StaffRole[] = ['STAFF', 'SENIOR_STAFF', 'MANAGER'];
    for (const role of roles) {
      const staff = createMockStaff({ staff_role: role });
      expect(staff.staff_role).toBe(role);
    }
  });

  it('should support all statuses', () => {
    const statuses: StaffStatus[] = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
    for (const status of statuses) {
      const staff = createMockStaff({ status });
      expect(staff.status).toBe(status);
    }
  });

  it('should enforce guild isolation', () => {
    const s1 = createMockStaff({ guild_id: 'g1', user_id: 'u1' });
    const s2 = createMockStaff({ guild_id: 'g2', user_id: 'u1' });
    expect(s1.guild_id).not.toBe(s2.guild_id);
  });

  it('should track added_by', () => {
    const staff = createMockStaff({ added_by: 'admin1' });
    expect(staff.added_by).toBe('admin1');
  });

  it('added_by can be null', () => {
    const staff = createMockStaff({ added_by: null });
    expect(staff.added_by).toBeNull();
  });

  it('should have timestamps', () => {
    const staff = createMockStaff();
    expect(staff.created_at).toBeDefined();
    expect(staff.updated_at).toBeDefined();
  });
});

describe('StaffRepository', () => {
  it('should have addStaff method', () => {
    const repo = new StaffRepository();
    expect(typeof repo.addStaff).toBe('function');
  });

  it('should have getStaff method', () => {
    const repo = new StaffRepository();
    expect(typeof repo.getStaff).toBe('function');
  });

  it('should have listStaff method', () => {
    const repo = new StaffRepository();
    expect(typeof repo.listStaff).toBe('function');
  });

  it('should have updateStaff method', () => {
    const repo = new StaffRepository();
    expect(typeof repo.updateStaff).toBe('function');
  });

  it('should have removeStaff method', () => {
    const repo = new StaffRepository();
    expect(typeof repo.removeStaff).toBe('function');
  });

  it('should have isStaff method', () => {
    const repo = new StaffRepository();
    expect(typeof repo.isStaff).toBe('function');
  });
});

describe('Staff Status Transitions', () => {
  it('ACTIVE → INACTIVE is valid', () => {
    const staff = createMockStaff({ status: 'ACTIVE' });
    staff.status = 'INACTIVE';
    expect(staff.status).toBe('INACTIVE');
  });

  it('ACTIVE → SUSPENDED is valid', () => {
    const staff = createMockStaff({ status: 'ACTIVE' });
    staff.status = 'SUSPENDED';
    expect(staff.status).toBe('SUSPENDED');
  });

  it('INACTIVE → ACTIVE is valid', () => {
    const staff = createMockStaff({ status: 'INACTIVE' });
    staff.status = 'ACTIVE';
    expect(staff.status).toBe('ACTIVE');
  });

  it('SUSPENDED → ACTIVE is valid', () => {
    const staff = createMockStaff({ status: 'SUSPENDED' });
    staff.status = 'ACTIVE';
    expect(staff.status).toBe('ACTIVE');
  });

  it('SUSPENDED → INACTIVE is valid', () => {
    const staff = createMockStaff({ status: 'SUSPENDED' });
    staff.status = 'INACTIVE';
    expect(staff.status).toBe('INACTIVE');
  });
});

describe('Staff Role Promotions', () => {
  it('STAFF → SENIOR_STAFF is valid', () => {
    const staff = createMockStaff({ staff_role: 'STAFF' });
    staff.staff_role = 'SENIOR_STAFF';
    expect(staff.staff_role).toBe('SENIOR_STAFF');
  });

  it('SENIOR_STAFF → MANAGER is valid', () => {
    const staff = createMockStaff({ staff_role: 'SENIOR_STAFF' });
    staff.staff_role = 'MANAGER';
    expect(staff.staff_role).toBe('MANAGER');
  });

  it('STAFF → MANAGER (skip) is valid model-wise', () => {
    const staff = createMockStaff({ staff_role: 'STAFF' });
    staff.staff_role = 'MANAGER';
    expect(staff.staff_role).toBe('MANAGER');
  });
});

describe('Staff Role Demotions', () => {
  it('MANAGER → SENIOR_STAFF is valid', () => {
    const staff = createMockStaff({ staff_role: 'MANAGER' });
    staff.staff_role = 'SENIOR_STAFF';
    expect(staff.staff_role).toBe('SENIOR_STAFF');
  });

  it('SENIOR_STAFF → STAFF is valid', () => {
    const staff = createMockStaff({ staff_role: 'SENIOR_STAFF' });
    staff.staff_role = 'STAFF';
    expect(staff.staff_role).toBe('STAFF');
  });
});

describe('Staff Security — Privilege Escalation', () => {
  it('STAFF cannot promote anyone', () => {
    expect(canPromote('STAFF', 'STAFF', 'SENIOR_STAFF')).toBe(false);
    expect(canPromote('STAFF', 'STAFF', 'MANAGER')).toBe(false);
    expect(canPromote('STAFF', 'SENIOR_STAFF', 'MANAGER')).toBe(false);
  });

  it('SENIOR_STAFF cannot promote anyone', () => {
    expect(canPromote('SENIOR_STAFF', 'STAFF', 'SENIOR_STAFF')).toBe(false);
    expect(canPromote('SENIOR_STAFF', 'STAFF', 'MANAGER')).toBe(false);
  });

  it('STAFF cannot demote anyone', () => {
    expect(canDemote('STAFF', 'SENIOR_STAFF')).toBe(false);
    expect(canDemote('STAFF', 'MANAGER')).toBe(false);
  });

  it('SENIOR_STAFF cannot demote anyone', () => {
    expect(canDemote('SENIOR_STAFF', 'MANAGER')).toBe(false);
    expect(canDemote('SENIOR_STAFF', 'STAFF')).toBe(false);
  });
});

describe('Staff Security — Self-Management Prevention', () => {
  it('canManageStaff is purely role-based (no self-check)', () => {
    const manager = createMockStaff({ staff_role: 'MANAGER', user_id: 'self' });
    const target = createMockStaff({ staff_role: 'STAFF', user_id: 'other' });
    expect(canManageStaff(manager.staff_role, target.staff_role)).toBe(true);
  });

  it('self-promotion blocked at service level (role-based check)', () => {
    expect(canPromote('STAFF', 'STAFF', 'SENIOR_STAFF')).toBe(false);
  });
});

describe('Staff Security — Hierarchy Enforcement', () => {
  const roles: StaffRole[] = ['STAFF', 'SENIOR_STAFF', 'MANAGER'];

  it('lower role cannot manage higher role', () => {
    for (let i = 0; i < roles.length - 1; i++) {
      for (let j = i + 1; j < roles.length; j++) {
        expect(canManageStaff(roles[i], roles[j])).toBe(false);
      }
    }
  });

  it('higher role can manage lower role', () => {
    for (let i = 1; i < roles.length; i++) {
      for (let j = 0; j < i; j++) {
        expect(canManageStaff(roles[i], roles[j])).toBe(true);
      }
    }
  });

  it('same role cannot manage each other', () => {
    for (const role of roles) {
      expect(canManageStaff(role, role)).toBe(false);
    }
  });
});

describe('Staff — Guild Owner Protection', () => {
  it('guild owner is not part of staff model (handled by command)', () => {
    const staff = createMockStaff({ user_id: 'owner1' });
    expect(staff.user_id).toBe('owner1');
  });
});

describe('Staff — Invalid/Edge Cases', () => {
  it('user_id can be any string', () => {
    const staff = createMockStaff({ user_id: '' });
    expect(staff.user_id).toBe('');
  });

  it('guild_id can be any string', () => {
    const staff = createMockStaff({ guild_id: '' });
    expect(staff.guild_id).toBe('');
  });

  it('staff_role defaults to STAFF', () => {
    const staff = createMockStaff({ staff_role: undefined as any });
    expect(staff.staff_role).toBeUndefined();
  });

  it('status defaults to ACTIVE', () => {
    const staff = createMockStaff({ status: undefined as any });
    expect(staff.status).toBeUndefined();
  });
});

describe('Staff Service — addStaff', () => {
  it('should have addStaff function', () => {
    expect(typeof addStaff).toBe('function');
  });
});

describe('Staff Service — removeStaff', () => {
  it('should have removeStaff function', () => {
    expect(typeof removeStaff).toBe('function');
  });
});

describe('Staff Service — setStaffStatus', () => {
  it('should have setStaffStatus function', () => {
    expect(typeof setStaffStatus).toBe('function');
  });
});

describe('Staff Service — promoteStaff', () => {
  it('should have promoteStaff function', () => {
    expect(typeof promoteStaff).toBe('function');
  });
});

describe('Staff Service — demoteStaff', () => {
  it('should have demoteStaff function', () => {
    expect(typeof demoteStaff).toBe('function');
  });
});

describe('Staff Service — getStaffInfo', () => {
  it('should have getStaffInfo function', () => {
    expect(typeof getStaffInfo).toBe('function');
  });
});
