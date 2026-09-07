import { describe, it, expect } from 'vitest';
import { generateErrorId, BotError, DatabaseConnectionError, PermissionError, ValidationError, GuildNotFoundError } from '../src/utils/errors';

describe('generateErrorId', () => {
  it('should generate unique error IDs', () => {
    const id1 = generateErrorId();
    const id2 = generateErrorId();
    expect(id1).not.toBe(id2);
  });

  it('should match ERR-TIMESTAMP-HEX format', () => {
    const id = generateErrorId();
    expect(id).toMatch(/^ERR-\d+-[A-F0-9]+$/);
  });
});

describe('BotError', () => {
  it('should create error with all properties', () => {
    const error = new BotError('Test error', 'TEST_CODE', 400);
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.statusCode).toBe(400);
    expect(error.errorId).toMatch(/^ERR-/);
    expect(error.name).toBe('BotError');
  });

  it('should default to statusCode 500', () => {
    const error = new BotError('Test', 'CODE');
    expect(error.statusCode).toBe(500);
  });
});

describe('DatabaseConnectionError', () => {
  it('should have correct defaults', () => {
    const error = new DatabaseConnectionError();
    expect(error.code).toBe('DB_CONNECTION_ERROR');
    expect(error.statusCode).toBe(500);
    expect(error.name).toBe('DatabaseConnectionError');
  });
});

describe('PermissionError', () => {
  it('should have correct defaults', () => {
    const error = new PermissionError();
    expect(error.code).toBe('PERMISSION_DENIED');
    expect(error.statusCode).toBe(403);
    expect(error.name).toBe('PermissionError');
  });
});

describe('ValidationError', () => {
  it('should include field name', () => {
    const error = new ValidationError('Invalid input', 'email');
    expect(error.field).toBe('email');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.statusCode).toBe(400);
  });
});

describe('GuildNotFoundError', () => {
  it('should include guild ID in message', () => {
    const error = new GuildNotFoundError('123456789');
    expect(error.message).toContain('123456789');
    expect(error.code).toBe('GUILD_NOT_FOUND');
    expect(error.statusCode).toBe(404);
  });
});
