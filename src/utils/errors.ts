import { randomBytes } from 'crypto';

export const generateErrorId = (): string => {
  const timestamp = Date.now();
  const random = randomBytes(4).toString('hex').toUpperCase();
  return `ERR-${timestamp}-${random}`;
};

export class BotError extends Error {
  public readonly errorId: string;
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode = 500) {
    super(message);
    this.name = 'BotError';
    this.errorId = generateErrorId();
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class DatabaseConnectionError extends BotError {
  constructor(message = 'Failed to connect to database') {
    super(message, 'DB_CONNECTION_ERROR', 500);
    this.name = 'DatabaseConnectionError';
  }
}

export class DatabaseQueryError extends BotError {
  constructor(message = 'Database query failed') {
    super(message, 'DB_QUERY_ERROR', 500);
    this.name = 'DatabaseQueryError';
  }
}

export class PermissionError extends BotError {
  constructor(message = 'Insufficient permissions') {
    super(message, 'PERMISSION_DENIED', 403);
    this.name = 'PermissionError';
  }
}

export class ValidationError extends BotError {
  public readonly field?: string;

  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class GuildNotFoundError extends BotError {
  constructor(guildId: string) {
    super(`Guild not found: ${guildId}`, 'GUILD_NOT_FOUND', 404);
    this.name = 'GuildNotFoundError';
  }
}

export class MissingPermissionsError extends BotError {
  constructor(message = 'Missing permissions') {
    super(message, 'MISSING_PERMISSIONS', 403);
    this.name = 'MissingPermissionsError';
  }
}

export class BusinessRuleError extends BotError {
  constructor(message: string) {
    super(message, 'BUSINESS_RULE_ERROR', 400);
    this.name = 'BusinessRuleError';
  }
}

export class GuildOnlyError extends BotError {
  constructor(message = 'This command can only be used in a server') {
    super(message, 'GUILD_ONLY_ERROR', 400);
    this.name = 'GuildOnlyError';
  }
}
