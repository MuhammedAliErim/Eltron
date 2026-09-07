import pino from 'pino';
import { env } from '../config/env';
import { generateErrorId } from './errors';

const SENSITIVE_PATTERNS = [
  /token/i,
  /key/i,
  /secret/i,
  /password/i,
  /credential/i,
  /authorization/i,
  /bearer/i,
  /supabase.*role/i,
  /discord.*token/i,
  /bot.*token/i,
  /client.*secret/i,
];

const isSensitiveKey = (key: string): boolean =>
  SENSITIVE_PATTERNS.some((p) => p.test(key));

export const sanitizeValue = (value: unknown): unknown => {
  if (typeof value === 'string') {
    for (const pattern of SENSITIVE_PATTERNS) {
      if (pattern.test(value)) return '[REDACTED]';
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (typeof value === 'object' && value !== null) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (isSensitiveKey(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeValue(val);
      }
    }
    return sanitized;
  }
  return value;
};

export const logger = pino({
  level: env.NODE_ENV === 'development' ? 'debug' : 'info',
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  serializers: {
    err: (err) => ({
      type: err.constructor?.name || 'Error',
      message: err.message,
      code: err.code,
      errorId: err.errorId,
    }),
  },
});

export const formatError = (error: unknown): { message: string; stack?: string } => {
  if (error instanceof Error) {
    const sanitized = sanitizeValue({ message: error.message, stack: error.stack });
    if (typeof sanitized === 'object' && sanitized !== null && 'message' in sanitized) {
      return {
        message: String((sanitized as Record<string, unknown>).message),
        stack: 'stack' in sanitized ? String((sanitized as Record<string, unknown>).stack) : undefined,
      };
    }
    return { message: '[REDACTED]', stack: undefined };
  }
  return { message: String(error) };
};

export const logError = (msg: string, error: unknown): string => {
  const errorId = generateErrorId();
  const sanitized = sanitizeValue(error);
  logger.error({ errorId, err: sanitized }, msg);
  return errorId;
};
