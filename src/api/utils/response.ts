import { Response } from 'express';

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginationResult {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function parsePagination(query: Record<string, unknown>): PaginationParams {
  const page = Math.max(1, parseInt(String(query.page || '1'), 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(String(query.pageSize || '20'), 10) || 20));
  return { page, pageSize };
}

export function buildPagination(total: number, params: PaginationParams): PaginationResult {
  return {
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.ceil(total / params.pageSize),
  };
}

export function sendList<T>(res: Response, data: T[], total: number, pagination: PaginationParams): void {
  res.json({
    data,
    pagination: buildPagination(total, pagination),
  });
}

export function sendData<T>(res: Response, data: T): void {
  res.json({ data });
}

export function sendError(res: Response, status: number, error: string, code: string, errorId?: string): void {
  const body: Record<string, unknown> = { error, code };
  if (errorId) body.errorId = errorId;
  res.status(status).json(body);
}
