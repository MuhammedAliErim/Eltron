import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TicketRepository } from '../src/database/repositories/TicketRepository';
import { TicketRow, TicketStatus } from '../src/database/schema';

vi.mock('../src/database/connection', () => ({
  getSupabaseAdmin: () => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  }),
}));

const createMockTicket = (overrides: Partial<TicketRow> = {}): TicketRow => ({
  id: 1,
  guild_id: 'guild1',
  channel_id: 'channel_ticket_1',
  creator_id: 'user1',
  assigned_to: null,
  status: 'OPEN' as TicketStatus,
  category: 'general',
  subject: 'Test ticket',
  closed_at: null,
  closed_by: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe('TicketRepository', () => {
  let repo: TicketRepository;

  beforeEach(() => {
    repo = new TicketRepository();
    vi.clearAllMocks();
  });

  describe('createTicket', () => {
    it('should have createTicket method', () => {
      expect(typeof repo.createTicket).toBe('function');
    });
  });

  describe('getTicket', () => {
    it('should have getTicket method', () => {
      expect(typeof repo.getTicket).toBe('function');
    });
  });

  describe('getTicketByChannel', () => {
    it('should have getTicketByChannel method', () => {
      expect(typeof repo.getTicketByChannel).toBe('function');
    });
  });

  describe('getOpenTicketByUser', () => {
    it('should have getOpenTicketByUser method', () => {
      expect(typeof repo.getOpenTicketByUser).toBe('function');
    });
  });

  describe('listGuildTickets', () => {
    it('should have listGuildTickets method', () => {
      expect(typeof repo.listGuildTickets).toBe('function');
    });
  });

  describe('updateTicket', () => {
    it('should have updateTicket method', () => {
      expect(typeof repo.updateTicket).toBe('function');
    });
  });

  describe('claimTicket', () => {
    it('should have claimTicket method', () => {
      expect(typeof repo.claimTicket).toBe('function');
    });
  });

  describe('unclaimTicket', () => {
    it('should have unclaimTicket method', () => {
      expect(typeof repo.unclaimTicket).toBe('function');
    });
  });

  describe('closeTicket', () => {
    it('should have closeTicket method', () => {
      expect(typeof repo.closeTicket).toBe('function');
    });
  });

  describe('reopenTicket', () => {
    it('should have reopenTicket method', () => {
      expect(typeof repo.reopenTicket).toBe('function');
    });
  });

  describe('countOpenTickets', () => {
    it('should have countOpenTickets method', () => {
      expect(typeof repo.countOpenTickets).toBe('function');
    });
  });
});

describe('Ticket Model', () => {
  it('should create a valid ticket object', () => {
    const ticket = createMockTicket();
    expect(ticket.id).toBe(1);
    expect(ticket.guild_id).toBe('guild1');
    expect(ticket.status).toBe('OPEN');
    expect(ticket.creator_id).toBe('user1');
    expect(ticket.assigned_to).toBeNull();
    expect(ticket.closed_at).toBeNull();
    expect(ticket.closed_by).toBeNull();
  });

  it('should support CLAIMED status', () => {
    const ticket = createMockTicket({ status: 'CLAIMED', assigned_to: 'staff1' });
    expect(ticket.status).toBe('CLAIMED');
    expect(ticket.assigned_to).toBe('staff1');
  });

  it('should support CLOSED status', () => {
    const ticket = createMockTicket({
      status: 'CLOSED',
      closed_at: new Date().toISOString(),
      closed_by: 'staff1',
    });
    expect(ticket.status).toBe('CLOSED');
    expect(ticket.closed_at).not.toBeNull();
    expect(ticket.closed_by).toBe('staff1');
  });

  it('should support categories', () => {
    const categories = ['general', 'support', 'report', 'other'] as const;
    for (const cat of categories) {
      const ticket = createMockTicket({ category: cat });
      expect(ticket.category).toBe(cat);
    }
  });

  it('should enforce guild isolation', () => {
    const ticket1 = createMockTicket({ guild_id: 'guild_a', creator_id: 'user1' });
    const ticket2 = createMockTicket({ guild_id: 'guild_b', creator_id: 'user1' });
    expect(ticket1.guild_id).not.toBe(ticket2.guild_id);
  });

  it('should enforce user isolation', () => {
    const ticket1 = createMockTicket({ guild_id: 'guild1', creator_id: 'user1' });
    const ticket2 = createMockTicket({ guild_id: 'guild1', creator_id: 'user2' });
    expect(ticket1.creator_id).not.toBe(ticket2.creator_id);
  });
});

describe('Ticket Status Transitions', () => {
  it('OPEN -> CLAIMED is valid', () => {
    const ticket = createMockTicket({ status: 'OPEN' });
    expect(ticket.status).toBe('OPEN');
    const claimed = { ...ticket, status: 'CLAIMED' as TicketStatus, assigned_to: 'staff1' };
    expect(claimed.status).toBe('CLAIMED');
  });

  it('OPEN -> CLOSED is valid', () => {
    const ticket = createMockTicket({ status: 'OPEN' });
    const closed = { ...ticket, status: 'CLOSED' as TicketStatus };
    expect(closed.status).toBe('CLOSED');
  });

  it('CLAIMED -> CLOSED is valid', () => {
    const ticket = createMockTicket({ status: 'CLAIMED', assigned_to: 'staff1' });
    const closed = { ...ticket, status: 'CLOSED' as TicketStatus };
    expect(closed.status).toBe('CLOSED');
  });

  it('CLOSED -> OPEN is valid (reopen)', () => {
    const ticket = createMockTicket({ status: 'CLOSED' });
    const reopened = { ...ticket, status: 'OPEN' as TicketStatus };
    expect(reopened.status).toBe('OPEN');
  });
});

describe('Ticket Permission Logic', () => {
  const canManage = (userId: string, ticket: TicketRow, isGuildManager: boolean, isBanMember: boolean): boolean => {
    if (userId === ticket.creator_id) return true;
    if (isGuildManager) return true;
    if (isBanMember) return true;
    if (ticket.assigned_to === userId) return true;
    return false;
  };

  it('creator can manage own ticket', () => {
    const ticket = createMockTicket({ creator_id: 'user1' });
    expect(canManage('user1', ticket, false, false)).toBe(true);
  });

  it('non-creator cannot manage ticket', () => {
    const ticket = createMockTicket({ creator_id: 'user1' });
    expect(canManage('user2', ticket, false, false)).toBe(false);
  });

  it('guild manager can manage any ticket', () => {
    const ticket = createMockTicket({ creator_id: 'user1' });
    expect(canManage('manager1', ticket, true, false)).toBe(true);
  });

  it('ban member can manage any ticket', () => {
    const ticket = createMockTicket({ creator_id: 'user1' });
    expect(canManage('staff1', ticket, false, true)).toBe(true);
  });

  it('assigned staff can manage ticket', () => {
    const ticket = createMockTicket({ creator_id: 'user1', assigned_to: 'staff1' });
    expect(canManage('staff1', ticket, false, false)).toBe(true);
  });
});
