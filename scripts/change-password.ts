#!/usr/bin/env tsx
/**
 * Script to change password for an existing user in Turso database for Better Auth
 * Better Auth
 * 
 * Usage:
 *   pnpm tsx scripts/change-password.ts <username> <new-password>
 * 
 * Example:
 *   pnpm tsx scripts/change-password.ts john "newsecurepassword123"
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@libsql/client';
import { randomUUID } from 'crypto';
import { hashPassword } from 'better-auth/crypto';

// Load environment variables from .env.local or .env
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function changePassword(username: string, newPassword: string) {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error('Error: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in environment');
    process.exit(1);
  }

  if (!username || !newPassword) {
    console.error('Error: Username and new password are required');
    console.error('Usage: pnpm tsx scripts/change-password.ts <username> <new-password>');
    process.exit(1);
  }

  const client = createClient({
    url,
    authToken,
  });

  try {
    // Find the user by username
    const userResult = await client.execute({
      sql: 'SELECT id, email FROM user WHERE username = ?',
      args: [username],
    });

    if (userResult.rows.length === 0) {
      console.error(`❌ Error: User with username "${username}" not found`);
      process.exit(1);
    }

    const userId = userResult.rows[0].id as string;
    const userEmail = userResult.rows[0].email as string;

    // Hash the new password using Better Auth's hashPassword function
    const hashedPassword = await hashPassword(newPassword);
    
    // Get current timestamp
    const now = Date.now();

    // Update the password in the account table
    const updateResult = await client.execute({
      sql: `
        UPDATE account 
        SET password = ?, updatedAt = ?
        WHERE userId = ? AND providerId = 'credential'
      `,
      args: [hashedPassword, now, userId],
    });

    if (updateResult.rowsAffected === 0) {
      // Account might not exist, create it
      const accountId = crypto.randomUUID();
      await client.execute({
        sql: `
          INSERT INTO account (id, accountId, providerId, userId, password, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        args: [accountId, userEmail, 'credential', userId, hashedPassword, now, now],
      });
      console.log('✅ Password set successfully! (Account record created)');
    } else {
      console.log('✅ Password changed successfully!');
    }

    console.log(`   Username: ${username}`);
    console.log(`   Email: ${userEmail}`);
    console.log(`   User ID: ${userId}`);
    console.log('\nThe user can now log in with the new password.');
  } catch (error: any) {
    console.error('❌ Error changing password:', error.message);
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const [username, newPassword] = args;

if (!username || !newPassword) {
  console.error('Error: Username and new password are required');
  console.error('Usage: pnpm tsx scripts/change-password.ts <username> <new-password>');
  process.exit(1);
}

changePassword(username, newPassword).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

