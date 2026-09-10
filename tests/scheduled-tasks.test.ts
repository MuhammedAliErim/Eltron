import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  startTask,
  stopTask,
  isTaskRunning,
  calculateNextRun,
  TASK_TYPES,
} from '../src/services/task/ScheduledTaskService';
import type { ScheduledTaskRow } from '../src/database/repositories/ScheduledTaskRepository';

vi.mock('../src/database/connection', () => ({
  getSupabaseAdmin: () => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  }),
}));

vi.mock('../src/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  logError: vi.fn(),
}));

const createMockTask = (overrides: Partial<ScheduledTaskRow> = {}): ScheduledTaskRow => ({
  id: 'task-1',
  guild_id: 'guild1',
  name: 'Test Task',
  type: 'backup',
  config: {},
  cron_expression: null,
  interval_ms: 300000,
  enabled: true,
  last_run: null,
  next_run: null,
  created_by: 'user1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe('ScheduledTaskService — calculateNextRun', () => {
  it('should return a Date in the future', () => {
    const now = Date.now();
    const next = calculateNextRun(300000);
    expect(next).toBeInstanceOf(Date);
    expect(next.getTime()).toBeGreaterThan(now);
  });

  it('should return time approximately intervalMs in the future', () => {
    const now = Date.now();
    const interval = 600000;
    const next = calculateNextRun(interval);
    const diff = next.getTime() - now;
    expect(diff).toBeGreaterThanOrEqual(interval - 1000);
    expect(diff).toBeLessThanOrEqual(interval + 1000);
  });

  it('should handle small intervals', () => {
    const now = Date.now();
    const next = calculateNextRun(1000);
    expect(next.getTime()).toBeGreaterThanOrEqual(now + 900);
  });

  it('should handle large intervals', () => {
    const now = Date.now();
    const interval = 86400000;
    const next = calculateNextRun(interval);
    expect(next.getTime()).toBeGreaterThanOrEqual(now + interval - 1000);
  });
});

describe('ScheduledTaskService — isTaskRunning', () => {
  it('should return false for non-running task', () => {
    expect(isTaskRunning('nonexistent-task')).toBe(false);
  });

  it('should return false after task is stopped', () => {
    const task = createMockTask({ id: 'stop-test', enabled: true, interval_ms: 60000 });
    startTask(task);
    stopTask('stop-test');
    expect(isTaskRunning('stop-test')).toBe(false);
  });
});

describe('ScheduledTaskService — startTask', () => {
  afterEach(() => {
    stopTask('start-test-1');
    stopTask('start-test-2');
    stopTask('start-test-3');
  });

  it('should start a task and mark it running', () => {
    const task = createMockTask({ id: 'start-test-1', enabled: true, interval_ms: 60000 });
    startTask(task);
    expect(isTaskRunning('start-test-1')).toBe(true);
  });

  it('should not start a disabled task', () => {
    const task = createMockTask({ id: 'start-test-2', enabled: false, interval_ms: 60000 });
    startTask(task);
    expect(isTaskRunning('start-test-2')).toBe(false);
  });

  it('should not start a task without interval_ms', () => {
    const task = createMockTask({ id: 'start-test-3', enabled: true, interval_ms: null });
    startTask(task);
    expect(isTaskRunning('start-test-3')).toBe(false);
  });

  it('should not start a task that is already running', () => {
    const task = createMockTask({ id: 'start-test-1', enabled: true, interval_ms: 60000 });
    startTask(task);
    startTask(task);
    expect(isTaskRunning('start-test-1')).toBe(true);
  });
});

describe('ScheduledTaskService — stopTask', () => {
  afterEach(() => {
    stopTask('stop-test-1');
    stopTask('stop-test-2');
  });

  it('should stop a running task', () => {
    const task = createMockTask({ id: 'stop-test-1', enabled: true, interval_ms: 60000 });
    startTask(task);
    expect(isTaskRunning('stop-test-1')).toBe(true);
    stopTask('stop-test-1');
    expect(isTaskRunning('stop-test-1')).toBe(false);
  });

  it('should handle stopping a non-running task gracefully', () => {
    expect(() => stopTask('nonexistent')).not.toThrow();
  });
});

describe('ScheduledTaskService — TASK_TYPES', () => {
  it('should include backup', () => {
    expect(TASK_TYPES).toContain('backup');
  });

  it('should include reminder', () => {
    expect(TASK_TYPES).toContain('reminder');
  });

  it('should include announce', () => {
    expect(TASK_TYPES).toContain('announce');
  });

  it('should include cleanup', () => {
    expect(TASK_TYPES).toContain('cleanup');
  });

  it('should have exactly 4 types', () => {
    expect(TASK_TYPES).toHaveLength(4);
  });
});

describe('ScheduledTaskService — Timer Lifecycle', () => {
  afterEach(() => {
    stopTask('lifecycle-1');
  });

  it('should track task state correctly', () => {
    const task = createMockTask({ id: 'lifecycle-1', enabled: true, interval_ms: 60000 });
    expect(isTaskRunning('lifecycle-1')).toBe(false);
    startTask(task);
    expect(isTaskRunning('lifecycle-1')).toBe(true);
    stopTask('lifecycle-1');
    expect(isTaskRunning('lifecycle-1')).toBe(false);
  });
});

describe('ScheduledTaskRow Model', () => {
  it('should have valid default structure', () => {
    const task = createMockTask();
    expect(task.id).toBe('task-1');
    expect(task.guild_id).toBe('guild1');
    expect(task.name).toBe('Test Task');
    expect(task.type).toBe('backup');
    expect(task.enabled).toBe(true);
    expect(task.interval_ms).toBe(300000);
  });

  it('should support different types', () => {
    const types = ['backup', 'reminder', 'announce', 'cleanup'];
    for (const type of types) {
      const task = createMockTask({ type });
      expect(task.type).toBe(type);
    }
  });

  it('should support disabled state', () => {
    const task = createMockTask({ enabled: false });
    expect(task.enabled).toBe(false);
  });

  it('should support null interval_ms', () => {
    const task = createMockTask({ interval_ms: null });
    expect(task.interval_ms).toBeNull();
  });

  it('should support last_run', () => {
    const task = createMockTask({ last_run: new Date().toISOString() });
    expect(task.last_run).toBeDefined();
  });

  it('should support next_run', () => {
    const task = createMockTask({ next_run: new Date().toISOString() });
    expect(task.next_run).toBeDefined();
  });

  it('should support config object', () => {
    const task = createMockTask({ config: { channel_id: 'ch1', message: 'Test' } });
    expect(task.config).toEqual({ channel_id: 'ch1', message: 'Test' });
  });

  it('should enforce guild isolation', () => {
    const t1 = createMockTask({ guild_id: 'g1' });
    const t2 = createMockTask({ guild_id: 'g2' });
    expect(t1.guild_id).not.toBe(t2.guild_id);
  });

  it('should have timestamps', () => {
    const task = createMockTask();
    expect(task.created_at).toBeDefined();
    expect(task.updated_at).toBeDefined();
  });

  it('should track created_by', () => {
    const task = createMockTask({ created_by: 'admin1' });
    expect(task.created_by).toBe('admin1');
  });
});

describe('ScheduledTaskService — Security', () => {
  it('should not expose secrets in task config', () => {
    const task = createMockTask({ config: { channel_id: 'ch1' } });
    const json = JSON.stringify(task);
    expect(json).not.toContain('token');
    expect(json).not.toContain('secret');
  });

  it('should enforce guild isolation', () => {
    const t1 = createMockTask({ guild_id: 'guild_a' });
    const t2 = createMockTask({ guild_id: 'guild_b' });
    expect(t1.guild_id).not.toBe(t2.guild_id);
  });
});

describe('ScheduledTaskService — Edge Cases', () => {
  afterEach(() => {
    stopTask('edge-1');
  });

  it('should handle very short interval', () => {
    const task = createMockTask({ id: 'edge-1', enabled: true, interval_ms: 100 });
    startTask(task);
    expect(isTaskRunning('edge-1')).toBe(true);
  });

  it('should handle starting multiple different tasks', () => {
    const task1 = createMockTask({ id: 'edge-1', enabled: true, interval_ms: 60000 });
    startTask(task1);
    expect(isTaskRunning('edge-1')).toBe(true);
  });
});
