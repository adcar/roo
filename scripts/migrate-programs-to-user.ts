#!/usr/bin/env tsx
/**
 * Script to migrate existing programs to a specific user
 * 
 * This is useful when you have existing programs without user_id set
 * and want to assign them to a user.
 * 
 * Usage:
 *   pnpm tsx scripts/migrate-programs-to-user.ts <username>
 * 
 * Example:
 *   pnpm tsx scripts/migrate-programs-to-user.ts alex
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@libsql/client';

// Load environment variables from .env.local or .env
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function migrateProgramsToUser(username: string) {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error('Error: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in environment');
    process.exit(1);
  }

  if (!username) {
    console.error('Error: Username is required');
    console.error('Usage: pnpm tsx scripts/migrate-programs-to-user.ts <username>');
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

    // Find programs without user_id or with empty user_id
    const orphanedPrograms = await client.execute({
      sql: `SELECT id, name FROM programs WHERE user_id IS NULL OR user_id = ''`,
    });

    if (orphanedPrograms.rows.length === 0) {
      console.log('✅ No orphaned programs found. All programs already have a user assigned.');
      return;
    }

    console.log(`Found ${orphanedPrograms.rows.length} program(s) without a user assigned:`);
    orphanedPrograms.rows.forEach((row: any) => {
      console.log(`  - ${row.name} (ID: ${row.id})`);
    });

    // Update programs to assign them to the user
    const updateResult = await client.execute({
      sql: `UPDATE programs SET user_id = ? WHERE user_id IS NULL OR user_id = ''`,
      args: [userId],
    });

    console.log(`\n✅ Successfully assigned ${updateResult.rowsAffected} program(s) to user "${username}"`);
    console.log(`   User ID: ${userId}`);
  } catch (error: any) {
    console.error('❌ Error migrating programs:', error.message);
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const [username] = args;

if (!username) {
  console.error('Error: Username is required');
  console.error('Usage: pnpm tsx scripts/migrate-programs-to-user.ts <username>');
  process.exit(1);
}

migrateProgramsToUser(username).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

