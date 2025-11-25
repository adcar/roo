#!/usr/bin/env tsx
/**
 * Script to add a user to Turso database for Better Auth
 * 
 * Usage:
 *   pnpm tsx scripts/add-user.ts <username> <password> [email]
 * 
 * Example:
 *   pnpm tsx scripts/add-user.ts john "securepassword123" john@example.com
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@libsql/client';
import { randomUUID } from 'crypto';
import { hashPassword } from 'better-auth/crypto';

// Load environment variables from .env.local or .env
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function addUser(username: string, password: string, email?: string) {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error('Error: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in environment');
    process.exit(1);
  }

  if (!username || !password) {
    console.error('Error: Username and password are required');
    console.error('Usage: pnpm tsx scripts/add-user.ts <username> <password> [email]');
    process.exit(1);
  }

  // Use email if provided, otherwise generate a placeholder
  const userEmail = email || `${username}@workout.local`;

  const client = createClient({
    url,
    authToken,
  });

  try {
    // Ensure auth tables exist (idempotent - safe to run multiple times)
    await client.execute(`
      CREATE TABLE IF NOT EXISTS user (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT NOT NULL UNIQUE,
        emailVerified INTEGER,
        image TEXT,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        username TEXT UNIQUE
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS session (
        id TEXT PRIMARY KEY,
        expiresAt INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        createdAt INTEGER,
        updatedAt INTEGER,
        ipAddress TEXT,
        userAgent TEXT,
        userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS account (
        id TEXT PRIMARY KEY,
        accountId TEXT NOT NULL,
        providerId TEXT NOT NULL,
        userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        accessToken TEXT,
        refreshToken TEXT,
        idToken TEXT,
        accessTokenExpiresAt INTEGER,
        refreshTokenExpiresAt INTEGER,
        scope TEXT,
        password TEXT,
        createdAt INTEGER,
        updatedAt INTEGER
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS verification (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        expiresAt INTEGER NOT NULL,
        createdAt INTEGER,
        updatedAt INTEGER
      );
    `);

    // Generate a unique user ID
    const userId = randomUUID();
    
    // Hash the password using Better Auth's hashPassword function (uses scrypt by default)
    const hashedPassword = await hashPassword(password);
    
    // Get current timestamp
    const now = Date.now();

    // Insert user into the user table
    await client.execute({
      sql: `
        INSERT INTO user (id, email, username, createdAt, updatedAt, emailVerified)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [userId, userEmail, username, now, now, 1],
    });

    // Insert account record for email/password authentication
    const accountId = randomUUID();
    await client.execute({
      sql: `
        INSERT INTO account (id, accountId, providerId, userId, password, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      args: [accountId, userEmail, 'credential', userId, hashedPassword, now, now],
    });

    console.log('✅ User created successfully!');
    console.log(`   Username: ${username}`);
    console.log(`   Email: ${userEmail}`);
    console.log(`   User ID: ${userId}`);
    console.log('\nYou can now log in with this username and password.');
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint')) {
      console.error('❌ Error: Username or email already exists');
    } else {
      console.error('❌ Error creating user:', error.message);
    }
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const [username, password, email] = args;

addUser(username, password, email).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

