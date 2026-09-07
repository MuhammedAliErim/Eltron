import { getSupabaseAdmin } from './connection';
import { logger } from '../utils/logger';
import fs from 'fs/promises';
import path from 'path';

const MIGRATIONS_TABLE = '_migrations';

const SUPABASE_MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'supabase', 'migrations');

interface MigrationRecord {
  name: string;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getMigrationFiles(): Promise<string[]> {
  if (!(await fileExists(SUPABASE_MIGRATIONS_DIR))) {
    return [];
  }

  const files = await fs.readdir(SUPABASE_MIGRATIONS_DIR);
  const sqlFiles = files
    .filter((f) => f.endsWith('.sql'))
    .map((f) => path.join(SUPABASE_MIGRATIONS_DIR, f));

  sqlFiles.sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
  return sqlFiles;
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from(MIGRATIONS_TABLE).select('name').limit(1);

  if (error && error.code === '42P01') {
    return new Set();
  }

  const { data } = await supabase.from(MIGRATIONS_TABLE).select('name');
  return new Set(data?.map((m: MigrationRecord) => m.name) || []);
}

async function markAsApplied(migrationName: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from(MIGRATIONS_TABLE).insert({ name: migrationName });
  if (error) {
    throw new Error(`Failed to record migration ${migrationName}: ${error.message}`);
  }
}

export const showMigrationStatus = async (): Promise<void> => {
  const files = await getMigrationFiles();
  const applied = await getAppliedMigrations();

  logger.info('Migration Status:');
  logger.info('─'.repeat(60));

  if (files.length === 0) {
    logger.info('No migration files found.');
    return;
  }

  for (const file of files) {
    const name = path.basename(file);
    const status = applied.has(name) ? '✅ Applied' : '⏳ Pending';
    logger.info(`  ${status}  ${name}`);
  }

  logger.info('─'.repeat(60));
  logger.info(`Total: ${files.length} | Applied: ${applied.size} | Pending: ${files.length - applied.size}`);
};

export const listPendingMigrations = async (): Promise<string[]> => {
  const files = await getMigrationFiles();
  const applied = await getAppliedMigrations();
  return files.filter((f) => !applied.has(path.basename(f)));
};

export const markMigrationApplied = async (migrationName: string): Promise<void> => {
  await markAsApplied(migrationName);
  logger.info(`Marked as applied: ${migrationName}`);
};
