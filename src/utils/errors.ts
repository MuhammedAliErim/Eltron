import { randomBytes } from 'crypto';

export const generateErrorId = (): string => {
  const timestamp = Date.now();
  const random = randomBytes(4).toString('hex').toUpperCase();
  return `ERR-${timestamp}-${random}`;
};

/** Base class for all bot errors. Carries an errorId for tracing. */
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

/** Thrown when the database connection fails. */
export class DatabaseConnectionError extends BotError {
  constructor(message = 'Failed to connect to database') {
    super(message, 'DB_CONNECTION_ERROR', 500);
    this.name = 'DatabaseConnectionError';
  }
}

/** Thrown when a database query fails. */
export class DatabaseQueryError extends BotError {
  constructor(message = 'Database query failed') {
    super(message, 'DB_QUERY_ERROR', 500);
    this.name = 'DatabaseQueryError';
  }
}

/** Thrown when a user lacks the required Discord permissions. */
export class PermissionError extends BotError {
  constructor(message = 'Insufficient permissions') {
    super(message, 'PERMISSION_DENIED', 403);
    this.name = 'PermissionError';
  }
}

/** Thrown when user input fails validation. */
export class ValidationError extends BotError {
  public readonly field?: string;

  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/** Thrown when a guild record is not found in the database. */
export class GuildNotFoundError extends BotError {
  constructor(guildId: string) {
    super(`Guild not found: ${guildId}`, 'GUILD_NOT_FOUND', 404);
    this.name = 'GuildNotFoundError';
  }
}

/** Thrown when the bot itself is missing required Discord permissions. */
export class MissingPermissionsError extends BotError {
  constructor(message = 'Missing permissions') {
    super(message, 'MISSING_PERMISSIONS', 403);
    this.name = 'MissingPermissionsError';
  }
}

/** Thrown when a business rule is violated (e.g., duplicate entry). */
export class BusinessRuleError extends BotError {
  constructor(message: string) {
    super(message, 'BUSINESS_RULE_ERROR', 400);
    this.name = 'BusinessRuleError';
  }
}

/** Thrown when a command is used outside of a guild. */
export class GuildOnlyError extends BotError {
  constructor(message = 'This command can only be used in a server') {
    super(message, 'GUILD_ONLY_ERROR', 400);
    this.name = 'GuildOnlyError';
  }
}

/**
 * Thrown when a user is sending commands too fast.
 * `retryAfterMs` indicates how long to wait before retrying.
 */
export class RateLimitError extends BotError {
  public readonly retryAfterMs: number;

  constructor(retryAfterMs: number, message?: string) {
    super(
      message ?? `You are being rate limited. Try again in ${Math.ceil(retryAfterMs / 1000)}s.`,
      'RATE_LIMITED',
      429
    );
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

/** Thrown when a requested resource (record, channel, user, etc.) is not found. */
export class NotFoundError extends BotError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} not found: ${id}` : `${resource} not found`,
      'NOT_FOUND',
      404
    );
    this.name = 'NotFoundError';
  }
}

/** Thrown when the bot or service is misconfigured (e.g., missing env variable). */
export class ConfigurationError extends BotError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR', 500);
    this.name = 'ConfigurationError';
  }
}

