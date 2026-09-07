import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from './connection';

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
}
