#!/usr/bin/env tsx
/**
 * Script to migrate ALL existing data (programs, workout logs, custom exercises) to a specific user
 * 
 * This is a convenience script that runs all migration scripts in one go.
 * 
 * Usage:
 *   pnpm tsx scripts/migrate-all-to-user.ts <username>
 * 
 * Example:
 *   pnpm tsx scripts/migrate-all-to-user.ts alex
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@libsql/client';

// Load environment variables from .env.local or .env
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function migrateAllToUser(username: string) {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error('Error: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in environment');
    process.exit(1);
  }

  if (!username) {
    console.error('Error: Username is required');
    console.error('Usage: pnpm tsx scripts/migrate-all-to-user.ts <username>');
    process.exit(1);
  }

  const client = createClient({
    url,
    authToken,
  });

  try {
    // Find the user by username
    const userResult = await client.execute({
      sql: 'SELECT id FROM user WHERE username = ?',
      args: [username],
    });

    if (userResult.rows.length === 0) {
      console.error(`❌ Error: User with username "${username}" not found`);
      process.exit(1);
    }

    const userId = userResult.rows[0].id as string;

    console.log(`\n🔄 Migrating all data to user: ${username} (ID: ${userId})\n`);

    // Migrate programs
    console.log('📋 Migrating programs...');
    const orphanedPrograms = await client.execute({
      sql: `SELECT id, name FROM programs WHERE user_id IS NULL OR user_id = ''`,
    });
    if (orphanedPrograms.rows.length > 0) {
      const updatePrograms = await client.execute({
        sql: `UPDATE programs SET user_id = ? WHERE user_id IS NULL OR user_id = ''`,
        args: [userId],
      });
      console.log(`   ✅ Assigned ${updatePrograms.rowsAffected} program(s)`);
    } else {
      console.log('   ✅ No orphaned programs found');
    }

    // Migrate workout logs
    console.log('\n📊 Migrating workout logs...');
    const orphanedLogs = await client.execute({
      sql: `SELECT id FROM workout_logs WHERE user_id IS NULL OR user_id = ''`,
    });
    if (orphanedLogs.rows.length > 0) {
      const updateLogs = await client.execute({
        sql: `UPDATE workout_logs SET user_id = ? WHERE user_id IS NULL OR user_id = ''`,
        args: [userId],
      });
      console.log(`   ✅ Assigned ${updateLogs.rowsAffected} workout log(s)`);
    } else {
      console.log('   ✅ No orphaned workout logs found');
    }

    // Migrate custom exercises
    console.log('\n💪 Migrating custom exercises...');
    const orphanedExercises = await client.execute({
      sql: `SELECT id FROM custom_exercises WHERE user_id IS NULL OR user_id = ''`,
    });
    if (orphanedExercises.rows.length > 0) {
      const updateExercises = await client.execute({
        sql: `UPDATE custom_exercises SET user_id = ? WHERE user_id IS NULL OR user_id = ''`,
        args: [userId],
      });
      console.log(`   ✅ Assigned ${updateExercises.rowsAffected} custom exercise(s)`);
    } else {
      console.log('   ✅ No orphaned custom exercises found');
    }

    console.log('\n✨ Migration complete! All data has been assigned to the user.');
  } catch (error: any) {
    console.error('❌ Error migrating data:', error.message);
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const [username] = args;

if (!username) {
  console.error('Error: Username is required');
  console.error('Usage: pnpm tsx scripts/migrate-all-to-user.ts <username>');
  process.exit(1);
}

migrateAllToUser(username).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

