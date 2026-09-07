import { describe, it, expect } from 'vitest';
import { ValidationGuard } from '../src/middleware/ValidationGuard';
import { ValidationError } from '../src/utils/errors';
import { z } from 'zod';

describe('ValidationGuard', () => {
  const testSchema = z.object({
    name: z.string().min(1),
    age: z.number().min(0),
  });

  it('should return parsed data on valid input', () => {
    const result = ValidationGuard.validate(testSchema, { name: 'test', age: 25 });
    expect(result).toEqual({ name: 'test', age: 25 });
  });

  it('should throw ValidationError on invalid input', () => {
    expect(() => {
      ValidationGuard.validate(testSchema, { name: '', age: -1 });
    }).toThrow(ValidationError);
  });

  it('should include field name in error', () => {
    try {
      ValidationGuard.validate(testSchema, { name: '', age: 25 });
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).field).toBe('name');
    }
  });
});
