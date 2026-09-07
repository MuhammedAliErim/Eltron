import dotenv from 'dotenv';
import path from 'path';
import { connectDatabase } from '../src/database/connection';
import { showMigrationStatus, listPendingMigrations, markMigrationApplied } from '../src/database/migration';
import { logger } from '../src/utils/logger';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const command = process.argv[2];

async function main(): Promise<void> {
  try {
    await connectDatabase();

    switch (command) {
      case 'status':
        await showMigrationStatus();
        break;

      case 'pending':
        const pending = await listPendingMigrations();
        if (pending.length === 0) {
          logger.info('No pending migrations.');
        } else {
          logger.info('Pending migrations:');
          pending.forEach((f) => logger.info(`  - ${path.basename(f)}`));
        }
        break;

      case 'mark':
        const migrationName = process.argv[3];
        if (!migrationName) {
          logger.error('Usage: npx tsx scripts/migrate.ts mark <migration_name>');
          process.exit(1);
        }
        await markMigrationApplied(migrationName);
        break;

      default:
        logger.info('Eltron Migration Manager');
        logger.info('');
        logger.info('Usage:');
        logger.info('  npx tsx scripts/migrate.ts status    Show migration status');
        logger.info('  npx tsx scripts/migrate.ts pending   List pending migrations');
        logger.info('  npx tsx scripts/migrate.ts mark <name> Mark migration as applied');
        logger.info('');
        logger.info('To apply migrations:');
        logger.info('  1. Open Supabase Dashboard > SQL Editor');
        logger.info('  2. Copy contents from supabase/migrations/*.sql');
        logger.info('  3. Run the SQL');
        logger.info('  4. Run: npx tsx scripts/migrate.ts mark <filename>');
        logger.info('');
        logger.info('Or use Supabase CLI:');
        logger.info('  supabase db push');
        logger.info('  supabase migration up');
        break;
    }

    process.exit(0);
  } catch (error) {
    logger.error('Migration command failed:', error);
    process.exit(1);
  }
}

main();
