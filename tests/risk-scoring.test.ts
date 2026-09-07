import { describe, it, expect, beforeEach } from 'vitest';
import {
  addSignal,
  addSignals,
  getScore,
  getRiskLevel,
  getRiskDetail,
  setRaidActive,
  resetScore,
  getSignalWeight,
  getAllSignalWeights,
  getScoreForLevel,
  getActionForLevel,
  getDecayConfig,
  cleanupRiskStates,
} from '../src/services/security/RiskScoringService';
import { RiskSignal } from '../src/database/schema';

describe('RiskScoringService', () => {
  beforeEach(() => {
    resetScore('test_guild', 'test_user');
    resetScore('test_guild_2', 'test_user_2');
    resetScore('guild_a', 'user_a');
    resetScore('guild_b', 'user_a');
  });

  describe('getScore', () => {
    it('should return 0 for unknown user', () => {
      expect(getScore('unknown_guild', 'unknown_user')).toBe(0);
    });
  });

  describe('addSignal', () => {
    it('should add signal and return score', () => {
      const score = addSignal('test_guild', 'test_user', 'banned_word');
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should accumulate scores from multiple signals', () => {
      resetScore('test_guild', 'test_user');
      const s1 = addSignal('test_guild', 'test_user', 'banned_word');
      const s2 = addSignal('test_guild', 'test_user', 'flood_detected');
      expect(s2).toBeGreaterThanOrEqual(s1);
    });

    it('should never exceed 100', () => {
      resetScore('test_guild', 'test_user');
      for (let i = 0; i < 20; i++) {
        addSignal('test_guild', 'test_user', 'raid_detected');
      }
      expect(getScore('test_guild', 'test_user')).toBeLessThanOrEqual(100);
    });

    it('should never go below 0', () => {
      const score = getScore('nonexistent', 'nonexistent');
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should support custom weight override', () => {
      resetScore('test_guild', 'test_user');
      const score = addSignal('test_guild', 'test_user', 'banned_word', 50);
      expect(score).toBe(50);
    });
  });

  describe('addSignals', () => {
    it('should add multiple signals at once', () => {
      resetScore('test_guild', 'test_user');
      const score = addSignals('test_guild', 'test_user', [
        'banned_word',
        'flood_detected',
        'mention_spam',
      ]);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should handle empty signals array', () => {
      const scoreBefore = getScore('test_guild', 'test_user');
      const score = addSignals('test_guild', 'test_user', []);
      expect(score).toBe(scoreBefore);
    });
  });

  describe('getRiskLevel', () => {
    it('should return LOW for score 0', () => {
      expect(getRiskLevel('unknown', 'unknown')).toBe('LOW');
    });

    it('should return correct levels', () => {
      resetScore('test_guild', 'test_user');

      addSignal('test_guild', 'test_user', 'caps_spam');
      const level1 = getRiskLevel('test_guild', 'test_user');
      expect(['LOW', 'MODERATE']).toContain(level1);

      resetScore('test_guild', 'test_user');
      for (let i = 0; i < 10; i++) {
        addSignal('test_guild', 'test_user', 'raid_detected');
      }
      const level2 = getRiskLevel('test_guild', 'test_user');
      expect(level2).toBe('CRITICAL');
    });
  });

  describe('getRiskDetail', () => {
    it('should return default detail for unknown user', () => {
      const detail = getRiskDetail('unknown', 'unknown');
      expect(detail.score).toBe(0);
      expect(detail.level).toBe('LOW');
      expect(detail.lastSignal).toBeNull();
      expect(detail.signalCount).toBe(0);
      expect(detail.raidActive).toBe(false);
    });

    it('should return correct detail after signals', () => {
      resetScore('test_guild', 'test_user');
      addSignal('test_guild', 'test_user', 'banned_word');
      addSignal('test_guild', 'test_user', 'flood_detected');

      const detail = getRiskDetail('test_guild', 'test_user');
      expect(detail.signalCount).toBe(2);
      expect(detail.lastSignal).toBe('flood_detected');
      expect(detail.score).toBeGreaterThan(0);
    });
  });

  describe('setRaidActive', () => {
    it('should set raid active flag', () => {
      resetScore('test_guild', 'test_user');
      setRaidActive('test_guild', 'test_user', true);
      const detail = getRiskDetail('test_guild', 'test_user');
      expect(detail.raidActive).toBe(true);
    });

    it('should clear raid active flag', () => {
      resetScore('test_guild', 'test_user');
      setRaidActive('test_guild', 'test_user', true);
      setRaidActive('test_guild', 'test_user', false);
      const detail = getRiskDetail('test_guild', 'test_user');
      expect(detail.raidActive).toBe(false);
    });
  });

  describe('resetScore', () => {
    it('should reset score to 0', () => {
      addSignal('test_guild', 'test_user', 'raid_detected');
      expect(getScore('test_guild', 'test_user')).toBeGreaterThan(0);

      resetScore('test_guild', 'test_user');
      expect(getScore('test_guild', 'test_user')).toBe(0);
    });
  });

  describe('guild isolation', () => {
    it('should isolate scores between guilds', () => {
      addSignal('guild_a', 'user_a', 'raid_detected');
      const scoreA = getScore('guild_a', 'user_a');
      expect(scoreA).toBeGreaterThan(0);

      const scoreB = getScore('guild_b', 'user_a');
      expect(scoreB).toBe(0);
    });
  });

  describe('user isolation', () => {
    it('should isolate scores between users in same guild', () => {
      addSignal('test_guild', 'user_1', 'raid_detected');
      const score1 = getScore('test_guild', 'user_1');
      const score2 = getScore('test_guild', 'user_2');
      expect(score1).toBeGreaterThan(0);
      expect(score2).toBe(0);
    });
  });

  describe('signal weights', () => {
    it('should have weight for every signal', () => {
      const weights = getAllSignalWeights();
      const signals: RiskSignal[] = [
        'very_new_account', 'suspicious_join', 'join_burst', 'raid_detected',
        'flood_detected', 'duplicate_message', 'mention_spam', 'caps_spam',
        'banned_word', 'discord_invite', 'suspicious_url', 'repeated_violations',
        'moderation_history',
      ];

      for (const signal of signals) {
        expect(weights[signal]).toBeGreaterThan(0);
        expect(getSignalWeight(signal)).toBeGreaterThan(0);
      }
    });
  });

  describe('getScoreForLevel', () => {
    it('should return correct ranges', () => {
      expect(getScoreForLevel('LOW')).toEqual({ min: 0, max: 19 });
      expect(getScoreForLevel('MODERATE')).toEqual({ min: 20, max: 39 });
      expect(getScoreForLevel('ELEVATED')).toEqual({ min: 40, max: 59 });
      expect(getScoreForLevel('HIGH')).toEqual({ min: 60, max: 79 });
      expect(getScoreForLevel('CRITICAL')).toEqual({ min: 80, max: 100 });
    });
  });

  describe('getActionForLevel', () => {
    it('LOW should have no action', () => {
      const action = getActionForLevel('LOW');
      expect(action.log).toBe(false);
      expect(action.action).toBe(false);
    });

    it('MODERATE should log only', () => {
      const action = getActionForLevel('MODERATE');
      expect(action.log).toBe(true);
      expect(action.action).toBe(false);
    });

    it('ELEVATED should log and monitor', () => {
      const action = getActionForLevel('ELEVATED');
      expect(action.log).toBe(true);
      expect(action.monitor).toBe(true);
      expect(action.action).toBe(false);
    });

    it('HIGH should take action', () => {
      const action = getActionForLevel('HIGH');
      expect(action.action).toBe(true);
      expect(action.actionType).toBe('WARN');
    });

    it('CRITICAL should take stronger action', () => {
      const action = getActionForLevel('CRITICAL');
      expect(action.action).toBe(true);
      expect(action.actionType).toBe('TIMEOUT');
    });
  });

  describe('decay', () => {
    it('should have valid decay config', () => {
      const config = getDecayConfig();
      expect(config.halfLifeMs).toBeGreaterThan(0);
      expect(config.factor).toBeGreaterThan(0);
      expect(config.factor).toBeLessThan(1);
    });
  });

  describe('cleanupRiskStates', () => {
    it('should not throw', () => {
      expect(() => cleanupRiskStates()).not.toThrow();
    });
  });

  describe('repeated signals', () => {
    it('should accumulate repeated signals', () => {
      resetScore('test_guild', 'test_user');
      addSignal('test_guild', 'test_user', 'banned_word');
      addSignal('test_guild', 'test_user', 'banned_word');
      addSignal('test_guild', 'test_user', 'banned_word');

      const detail = getRiskDetail('test_guild', 'test_user');
      expect(detail.signalCount).toBe(3);
      expect(detail.score).toBeGreaterThan(0);
    });
  });
});
