import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from './connection';
import { logger } from '../utils/logger';

export abstract class BaseRepository {
  protected _supabase: SupabaseClient | null = null;

  public get supabase(): SupabaseClient {
    if (!this._supabase) {
      return getSupabaseAdmin();
    }
    return this._supabase;
  }

  public setSupabaseClient(client: SupabaseClient): void {
    this._supabase = client;
  }

  protected isTableMissingError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const e = error as Record<string, unknown>;
    if (e.code === '42P01') return true;
    if (typeof e.message === 'string' && e.message.includes('relation') && e.message.includes('does not exist')) return true;
    return false;
  }

  protected handleTableError(error: unknown, context: string): null {
    if (this.isTableMissingError(error)) {
      logger.warn(`${context}: table does not exist, returning null`);
      return null;
    }
    throw error;
  }
}
