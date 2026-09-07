import { Request, Response, NextFunction } from 'express';
import { BotError } from '../../utils/errors';
import { logError } from '../../utils/logger';
import { sendError } from '../utils/response';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof BotError) {
    sendError(res, err.statusCode, err.message, err.code, err.errorId);
    return;
  }

  const errorId = logError('Unhandled API error', err);
  sendError(res, 500, 'Internal server error', 'INTERNAL_ERROR', errorId);
}
