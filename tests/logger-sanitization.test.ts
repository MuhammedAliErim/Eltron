import { describe, it, expect } from 'vitest';
import { sanitizeValue, formatError, logError } from '../src/utils/logger';

describe('Logger Sanitization', () => {
  describe('sanitizeValue', () => {
    it('should redact strings containing "token"', () => {
      expect(sanitizeValue('my_discord_token_abc123')).toBe('[REDACTED]');
    });

    it('should redact strings containing "key"', () => {
      expect(sanitizeValue('api_key_12345')).toBe('[REDACTED]');
    });

    it('should redact strings containing "secret"', () => {
      expect(sanitizeValue('my_secret_value')).toBe('[REDACTED]');
    });

    it('should redact strings containing "password"', () => {
      expect(sanitizeValue('password123')).toBe('[REDACTED]');
    });

    it('should redact short sensitive strings', () => {
      expect(sanitizeValue('token')).toBe('[REDACTED]');
      expect(sanitizeValue('key123')).toBe('[REDACTED]');
      expect(sanitizeValue('secret')).toBe('[REDACTED]');
    });

    it('should not redact normal strings', () => {
      expect(sanitizeValue('hello world')).toBe('hello world');
      expect(sanitizeValue('user_id_123')).toBe('user_id_123');
      expect(sanitizeValue('')).toBe('');
    });

    it('should redact object keys matching sensitive patterns', () => {
      const input = { token: 'abc123', name: 'test', secret_key: 'xyz' };
      const result = sanitizeValue(input) as Record<string, unknown>;
      expect(result.token).toBe('[REDACTED]');
      expect(result.name).toBe('test');
      expect(result.secret_key).toBe('[REDACTED]');
    });

    it('should recursively sanitize nested objects', () => {
      const input = {
        user: { name: 'test' },
        config: { api_token: 'secret123' },
      };
      const result = sanitizeValue(input) as Record<string, unknown>;
      expect((result.user as Record<string, unknown>).name).toBe('test');
      expect((result.config as Record<string, unknown>).api_token).toBe('[REDACTED]');
    });

    it('should sanitize arrays', () => {
      const input = ['normal', 'token_value', 'also_token'];
      const result = sanitizeValue(input) as string[];
      expect(result[0]).toBe('normal');
      expect(result[1]).toBe('[REDACTED]');
      expect(result[2]).toBe('[REDACTED]');
    });

    it('should pass through numbers and booleans', () => {
      expect(sanitizeValue(42)).toBe(42);
      expect(sanitizeValue(true)).toBe(true);
      expect(sanitizeValue(null)).toBe(null);
    });

    it('should redact supabase role keys', () => {
      expect(sanitizeValue('supabase_service_role_key')).toBe('[REDACTED]');
    });

    it('should redact discord token patterns', () => {
      expect(sanitizeValue('discord_token_abc')).toBe('[REDACTED]');
    });

    it('should redact bearer tokens', () => {
      expect(sanitizeValue('Bearer eyJhbGciOiJIUzI1NiJ9')).toBe('[REDACTED]');
    });
  });

  describe('formatError', () => {
    it('should format Error objects safely', () => {
      const error = new Error('test error');
      const result = formatError(error);
      expect(result.message).toBe('test error');
      expect(result.stack).toBeDefined();
    });

    it('should sanitize sensitive data in error messages', () => {
      const error = new Error('token is invalid');
      const result = formatError(error);
      expect(result.message).toBe('[REDACTED]');
    });

    it('should handle non-Error values', () => {
      const result = formatError('string error');
      expect(result.message).toBe('string error');
    });

    it('should handle number errors', () => {
      const result = formatError(404);
      expect(result.message).toBe('404');
    });

    it('should not crash on null/undefined', () => {
      const result1 = formatError(null);
      expect(result1.message).toBe('null');
      const result2 = formatError(undefined);
      expect(result2.message).toBe('undefined');
    });
  });

  describe('logError', () => {
    it('should return an error ID', () => {
      const errorId = logError('test message', new Error('test'));
      expect(errorId).toMatch(/^ERR-/);
    });

    it('should handle non-Error values', () => {
      const errorId = logError('test message', 'string error');
      expect(errorId).toMatch(/^ERR-/);
    });
  });
});
