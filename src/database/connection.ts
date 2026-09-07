import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { DatabaseConnectionError } from '../utils/errors';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

let supabaseAdmin: SupabaseClient;
let supabasePublic: SupabaseClient;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const connectDatabase = async (): Promise<void> => {
  supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  if (env.SUPABASE_ANON_KEY) {
    supabasePublic = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { error } = await supabaseAdmin.from('guilds').select('id').limit(1);

      if (!error || error.code === 'PGRST116') {
        logger.info('Successfully connected to Supabase');
        return;
      }

      if (error.code === '42P01' || error.message?.includes('relation')) {
        logger.warn('Tables may not exist yet. Run migrations to create the schema.');
        return;
      }

      logger.warn(`Connection attempt ${attempt} failed: ${error.message}`);
    } catch (err) {
      logger.warn(`Connection attempt ${attempt} threw: ${err}`);
    }

    if (attempt < MAX_RETRIES) {
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      logger.info(`Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  throw new DatabaseConnectionError('Failed to connect to Supabase after 3 attempts');
};

export const getSupabaseAdmin = (): SupabaseClient => {
  if (!supabaseAdmin) {
    throw new DatabaseConnectionError('Supabase admin client not initialized');
  }
  return supabaseAdmin;
};

export const getSupabasePublic = (): SupabaseClient => {
  if (!supabasePublic) {
    throw new DatabaseConnectionError('Supabase public client not initialized');
  }
  return supabasePublic;
};
