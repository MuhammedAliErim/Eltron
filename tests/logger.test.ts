import { describe, it, expect } from 'vitest';
import { formatError, logError } from '../src/utils/logger';

describe('formatError', () => {
  it('should format Error objects', () => {
    const error = new Error('test message');
    const result = formatError(error);
    expect(result.message).toBe('test message');
    expect(result.stack).toBeDefined();
  });

  it('should format string errors', () => {
    const result = formatError('string error');
    expect(result.message).toBe('string error');
  });

  it('should format unknown types', () => {
    const result = formatError(42);
    expect(result.message).toBe('42');
  });
});

describe('logError', () => {
  it('should return an error ID', () => {
    const errorId = logError('test message', new Error('test'));
    expect(errorId).toMatch(/^ERR-/);
  });

  it('should return unique error IDs', () => {
    const id1 = logError('test', new Error('a'));
    const id2 = logError('test', new Error('b'));
    expect(id1).not.toBe(id2);
  });
});
