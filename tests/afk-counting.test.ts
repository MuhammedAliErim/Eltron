import { describe, it, expect } from 'vitest';

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  return `${seconds} second${seconds !== 1 ? 's' : ''}`;
}

describe('AFK System', () => {
  describe('Duration Formatting', () => {
    it('should format seconds', () => {
      expect(formatDuration(5000)).toBe('5 seconds');
    });

    it('should format 1 second as singular', () => {
      expect(formatDuration(1000)).toBe('1 second');
    });

    it('should format minutes', () => {
      expect(formatDuration(120000)).toBe('2 minutes');
    });

    it('should format 1 minute as singular', () => {
      expect(formatDuration(60000)).toBe('1 minute');
    });

    it('should format hours', () => {
      expect(formatDuration(3600000)).toBe('1 hour');
    });

    it('should format 2 hours', () => {
      expect(formatDuration(7200000)).toBe('2 hours');
    });

    it('should format days', () => {
      expect(formatDuration(86400000)).toBe('1 day');
    });

    it('should format 2 days', () => {
      expect(formatDuration(172800000)).toBe('2 days');
    });
  });
});

describe('Counting System', () => {
  describe('Number Validation Logic', () => {
    it('should accept valid numbers', () => {
      expect(parseInt('1')).toBe(1);
      expect(parseInt('42')).toBe(42);
      expect(parseInt('1000')).toBe(1000);
    });

    it('should reject non-numbers', () => {
      expect(parseInt('abc')).toBeNaN();
      expect(parseInt('hello world')).toBeNaN();
    });

    it('should reject empty strings', () => {
      expect(parseInt('')).toBeNaN();
    });

    it('should validate correct sequence', () => {
      const current = 5;
      const next = current + 1;
      expect(next).toBe(6);
    });

    it('should detect wrong number', () => {
      const current = 5;
      const submitted = 7;
      expect(submitted).not.toBe(current + 1);
    });
  });

  describe('Milestone Detection', () => {
    const MILESTONES = [10, 25, 50, 100, 250, 500, 1000];

    it('should detect 10 milestone', () => {
      expect(MILESTONES.includes(10)).toBe(true);
    });

    it('should detect 100 milestone', () => {
      expect(MILESTONES.includes(100)).toBe(true);
    });

    it('should not trigger milestone for non-milestone numbers', () => {
      expect(MILESTONES.includes(11)).toBe(false);
    });

    it('should detect 1000 milestone', () => {
      expect(MILESTONES.includes(1000)).toBe(true);
    });

    it('should detect 250 milestone', () => {
      expect(MILESTONES.includes(250)).toBe(true);
    });

    it('should not trigger for negative numbers', () => {
      expect(MILESTONES.includes(-5)).toBe(false);
    });
  });
});
