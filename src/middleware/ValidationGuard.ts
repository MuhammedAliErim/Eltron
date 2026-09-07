import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

export class ValidationGuard {
  static validate<T>(schema: ZodSchema<T>, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof ZodError) {
        const firstIssue = error.issues[0];
        const field = firstIssue?.path?.join('.') || 'unknown';
        const message = firstIssue?.message || 'Validation failed';
        throw new ValidationError(message, field);
      }
      throw error;
    }
  }
}
