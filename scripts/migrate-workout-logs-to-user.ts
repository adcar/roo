#!/usr/bin/env tsx
/**
 * Script to migrate existing workout logs to a specific user
 * 
 * This is useful when you have existing workout logs without user_id set
 * and want to assign them to a user.
 * 
 * Usage:
 *   pnpm tsx scripts/migrate-workout-logs-to-user.ts <username>
 * 
 * Example:
 *   pnpm tsx scripts/migrate-workout-logs-to-user.ts alex
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@libsql/client';

// Load environment variables from .env.local or .env
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function migrateWorkoutLogsToUser(username: string) {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error('Error: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in environment');
    process.exit(1);
  }

  if (!username) {
    console.error('Error: Username is required');
    console.error('Usage: pnpm tsx scripts/migrate-workout-logs-to-user.ts <username>');
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

    // Find workout logs without user_id or with empty user_id
    const orphanedLogs = await client.execute({
      sql: `SELECT id, program_id, day_id, date FROM workout_logs WHERE user_id IS NULL OR user_id = ''`,
    });

    if (orphanedLogs.rows.length === 0) {
      console.log('✅ No orphaned workout logs found. All logs already have a user assigned.');
      return;
    }

    console.log(`Found ${orphanedLogs.rows.length} workout log(s) without a user assigned:`);
    orphanedLogs.rows.forEach((row: any) => {
      console.log(`  - Program: ${row.program_id}, Day: ${row.day_id}, Date: ${row.date} (ID: ${row.id})`);
    });

    // Update workout logs to assign them to the user
    const updateResult = await client.execute({
      sql: `UPDATE workout_logs SET user_id = ? WHERE user_id IS NULL OR user_id = ''`,
      args: [userId],
    });

    console.log(`\n✅ Successfully assigned ${updateResult.rowsAffected} workout log(s) to user "${username}"`);
    console.log(`   User ID: ${userId}`);
  } catch (error: any) {
    console.error('❌ Error migrating workout logs:', error.message);
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const [username] = args;

if (!username) {
  console.error('Error: Username is required');
  console.error('Usage: pnpm tsx scripts/migrate-workout-logs-to-user.ts <username>');
  process.exit(1);
}

migrateWorkoutLogsToUser(username).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

