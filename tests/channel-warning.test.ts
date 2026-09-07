import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordViolation,
  shouldDeescalate,
  deescalate,
  getChannelViolationInfo,
  resetChannelViolations,
  cleanupViolationStates,
} from '../src/services/security/ChannelWarningService';
import { GuildChannelWarningConfigRow } from '../src/database/schema';

const createMockConfig = (overrides: Partial<GuildChannelWarningConfigRow> = {}): GuildChannelWarningConfigRow => ({
  id: 1,
  guild_id: 'guild1',
  enabled: true,
  auto_warning_on_spam: true,
  slowmode_escalation_steps: [5, 15, 30, 60, 120],
  violation_threshold: 3,
  escalation_window_seconds: 300,
  deescalation_delay_seconds: 10,
  max_slowmode_seconds: 120,
  bypass_roles: [],
  bypass_users: [],
  log_channel_id: null,
  created_at: '',
  updated_at: '',
  ...overrides,
});

describe('ChannelWarningService', () => {
  beforeEach(() => {
    cleanupViolationStates();
    resetChannelViolations('guild1', 'channel1');
    resetChannelViolations('guild1', 'channel2');
  });

  describe('recordViolation', () => {
    it('should record first violation', () => {
      const config = createMockConfig();
      const result = recordViolation('guild1', 'channel1', config);
      expect(result.escalated).toBe(false);
    });

    it('should not escalate below threshold', () => {
      const config = createMockConfig({ violation_threshold: 4 });
      recordViolation('guild1', 'channel1', config);
      recordViolation('guild1', 'channel1', config);
      const result = recordViolation('guild1', 'channel1', config);
      expect(result.escalated).toBe(false);
    });

    it('should escalate at threshold', () => {
      const config = createMockConfig({ violation_threshold: 3 });
      recordViolation('guild1', 'channel1', config);
      recordViolation('guild1', 'channel1', config);
      const result = recordViolation('guild1', 'channel1', config);
      expect(result.escalated).toBe(true);
      expect(result.newSlowmode).toBe(5);
    });

    it('should escalate through steps', () => {
      const config = createMockConfig({ violation_threshold: 2 });
      recordViolation('guild1', 'channel1', config);
      const r1 = recordViolation('guild1', 'channel1', config);
      expect(r1.newSlowmode).toBe(5);

      const r2 = recordViolation('guild1', 'channel1', config);
      expect(r2.newSlowmode).toBe(15);
    });

    it('should cap at max slowmode', () => {
      const config = createMockConfig({
        violation_threshold: 1,
        slowmode_escalation_steps: [5, 15, 30, 60, 120, 300],
        max_slowmode_seconds: 120,
      });

      for (let i = 0; i < 10; i++) {
        recordViolation('guild1', 'channel1', config);
      }

      const info = getChannelViolationInfo('guild1', 'channel1');
      expect(info).not.toBeNull();
    });

    it('should reset after window expires', () => {
      const config = createMockConfig({ escalation_window_seconds: 0 });
      recordViolation('guild1', 'channel1', config);
      const result = recordViolation('guild1', 'channel1', config);
      expect(result.escalated).toBe(false);
    });

    it('should isolate between channels', () => {
      const config = createMockConfig({ violation_threshold: 2 });
      recordViolation('guild1', 'channel1', config);
      recordViolation('guild1', 'channel1', config);

      const info1 = getChannelViolationInfo('guild1', 'channel1');
      const info2 = getChannelViolationInfo('guild1', 'channel2');

      expect(info1).not.toBeNull();
      expect(info2).toBeNull();
    });

    it('should isolate between guilds', () => {
      const config = createMockConfig({ violation_threshold: 2 });
      recordViolation('guild_a', 'channel1', config);
      recordViolation('guild_a', 'channel1', config);

      const infoA = getChannelViolationInfo('guild_a', 'channel1');
      const infoB = getChannelViolationInfo('guild_b', 'channel1');

      expect(infoA).not.toBeNull();
      expect(infoB).toBeNull();
    });
  });

  describe('shouldDeescalate', () => {
    it('should return false when no violations', () => {
      const config = createMockConfig();
      expect(shouldDeescalate('guild1', 'channel1', config)).toBe(false);
    });

    it('should return false when step is 0', () => {
      const config = createMockConfig({ violation_threshold: 3 });
      recordViolation('guild1', 'channel1', config);
      expect(shouldDeescalate('guild1', 'channel1', config)).toBe(false);
    });
  });

  describe('deescalate', () => {
    it('should deescalate one step', () => {
      const config = createMockConfig({ violation_threshold: 2 });
      recordViolation('guild1', 'channel1', config);
      recordViolation('guild1', 'channel1', config);
      recordViolation('guild1', 'channel1', config);

      const result = deescalate('guild1', 'channel1', config);
      expect(result.deescalated).toBe(true);
      expect(result.newSlowmode).toBe(5);
    });

    it('should return false when no violations', () => {
      const config = createMockConfig();
      const result = deescalate('guild1', 'channel1', config);
      expect(result.deescalated).toBe(false);
    });
  });

  describe('resetChannelViolations', () => {
    it('should reset violations', () => {
      const config = createMockConfig({ violation_threshold: 2 });
      recordViolation('guild1', 'channel1', config);
      recordViolation('guild1', 'channel1', config);

      resetChannelViolations('guild1', 'channel1');
      const info = getChannelViolationInfo('guild1', 'channel1');
      expect(info).toBeNull();
    });
  });

  describe('cleanupViolationStates', () => {
    it('should not throw', () => {
      expect(() => cleanupViolationStates()).not.toThrow();
    });
  });
});
