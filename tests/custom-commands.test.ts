import { describe, it, expect } from 'vitest';

function processVariables(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  result = result.replace(/\{random:(\d+):(\d+)\}/g, (_m, min: string, max: string) => {
    return String(Math.floor(Math.random() * (Number(max) - Number(min) + 1)) + Number(min));
  });
  return result;
}

function validateCommandName(name: string): string {
  const normalized = name.toLowerCase().trim();
  if (normalized.length === 0) throw new Error('Command name cannot be empty');
  if (normalized.length > 30) throw new Error('Command name must be 30 characters or less');
  if (!/^[a-z0-9_]+$/.test(normalized)) throw new Error('Command name can only contain lowercase letters, numbers, and underscores');
  return normalized;
}

describe('Custom Commands', () => {
  describe('Variable Replacement', () => {
    it('should replace {user} variable', () => {
      const result = processVariables('Hello {user}!', { user: '<@123>' });
      expect(result).toBe('Hello <@123>!');
    });

    it('should replace {username} variable', () => {
      const result = processVariables('Welcome {username}', { username: 'TestUser' });
      expect(result).toBe('Welcome TestUser');
    });

    it('should replace {server} variable', () => {
      const result = processVariables('Server: {server}', { server: 'My Server' });
      expect(result).toBe('Server: My Server');
    });

    it('should replace {channel} variable', () => {
      const result = processVariables('In {channel}', { channel: '<#456>' });
      expect(result).toBe('In <#456>');
    });

    it('should replace {args} variable', () => {
      const result = processVariables('Args: {args}', { args: 'hello world' });
      expect(result).toBe('Args: hello world');
    });

    it('should replace {arg1} and {arg2} variables', () => {
      const result = processVariables('{arg1} and {arg2}', { arg1: 'first', arg2: 'second' });
      expect(result).toBe('first and second');
    });

    it('should replace {date} variable', () => {
      const result = processVariables('Date: {date}', { date: '2026-01-01' });
      expect(result).toBe('Date: 2026-01-01');
    });

    it('should replace {time} variable', () => {
      const result = processVariables('Time: {time}', { time: '12:00' });
      expect(result).toBe('Time: 12:00');
    });

    it('should replace {rolecount} variable', () => {
      const result = processVariables('Members: {rolecount}', { rolecount: '150' });
      expect(result).toBe('Members: 150');
    });

    it('should replace {online} variable', () => {
      const result = processVariables('Online: {online}', { online: '42' });
      expect(result).toBe('Online: 42');
    });

    it('should handle {random:X:Y} variable', () => {
      const result = processVariables('Random: {random:1:10}', {});
      const num = parseInt(result.replace('Random: ', ''));
      expect(num).toBeGreaterThanOrEqual(1);
      expect(num).toBeLessThanOrEqual(10);
    });

    it('should replace multiple variables at once', () => {
      const result = processVariables('{user} in {server} ({rolecount} members)', {
        user: '<@1>', server: 'Test', rolecount: '100'
      });
      expect(result).toBe('<@1> in Test (100 members)');
    });
  });

  describe('Name Validation', () => {
    it('should accept valid names', () => {
      expect(validateCommandName('test')).toBe('test');
      expect(validateCommandName('my_command')).toBe('my_command');
      expect(validateCommandName('cmd123')).toBe('cmd123');
    });

    it('should lowercase names', () => {
      expect(validateCommandName('TEST')).toBe('test');
    });

    it('should reject empty names', () => {
      expect(() => validateCommandName('')).toThrow('cannot be empty');
    });

    it('should reject names > 30 chars', () => {
      expect(() => validateCommandName('a'.repeat(31))).toThrow('30 characters');
    });

    it('should reject names with spaces', () => {
      expect(() => validateCommandName('my command')).toThrow();
    });

    it('should reject names with special characters', () => {
      expect(() => validateCommandName('cmd!')).toThrow();
    });

    it('should accept underscores', () => {
      expect(validateCommandName('my_cmd')).toBe('my_cmd');
    });

    it('should accept numbers', () => {
      expect(validateCommandName('cmd123')).toBe('cmd123');
    });
  });
});
