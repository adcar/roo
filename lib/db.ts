import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

let db: ReturnType<typeof drizzle<typeof schema>>;

export async function getDb() {
  if (!db) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url) {
      throw new Error('TURSO_DATABASE_URL environment variable is not set');
    }

    const client = createClient({
      url,
      authToken,
    });

    db = drizzle(client, { schema });

    // Initialize auth tables (Better Auth required tables)
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

    // Initialize application tables (idempotent - safe to run multiple times)
    // Add user_id column if it doesn't exist (for migration)
    await client.execute(`
      CREATE TABLE IF NOT EXISTS programs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        days TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        user_id TEXT NOT NULL
      );
    `);

    // Try to add user_id column if table exists without it (migration)
    // SQLite doesn't support adding NOT NULL columns with DEFAULT easily, so we check first
    try {
      const tableInfo = await client.execute(`PRAGMA table_info(programs);`);
      const hasUserId = tableInfo.rows.some((row: any) => row.name === 'user_id');
      if (!hasUserId) {
        // Add column as nullable first, then update existing rows, then make it NOT NULL
        await client.execute(`ALTER TABLE programs ADD COLUMN user_id TEXT;`);
        // Update existing rows to have empty string (they'll be filtered out until assigned to a user)
        await client.execute(`UPDATE programs SET user_id = '' WHERE user_id IS NULL;`);
      }
    } catch (e) {
      // Column already exists or table doesn't exist yet, ignore
    }

    await client.execute(`
      CREATE TABLE IF NOT EXISTS workout_logs (
        id TEXT PRIMARY KEY,
        program_id TEXT NOT NULL,
        day_id TEXT NOT NULL,
        week TEXT NOT NULL,
        date TEXT NOT NULL,
        exercises TEXT NOT NULL,
        user_id TEXT NOT NULL
      );
    `);

    // Try to add user_id column if table exists without it (migration)
    try {
      await client.execute(`ALTER TABLE workout_logs ADD COLUMN user_id TEXT NOT NULL DEFAULT '';`);
    } catch (e) {
      // Column already exists, ignore
    }

    await client.execute(`
      CREATE TABLE IF NOT EXISTS custom_exercises (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        primary_muscles TEXT NOT NULL,
        secondary_muscles TEXT NOT NULL,
        level TEXT,
        category TEXT,
        equipment TEXT,
        instructions TEXT,
        images TEXT NOT NULL,
        is_custom INTEGER DEFAULT 1,
        user_id TEXT NOT NULL
      );
    `);

    // Try to add user_id column if table exists without it (migration)
    try {
      await client.execute(`ALTER TABLE custom_exercises ADD COLUMN user_id TEXT NOT NULL DEFAULT '';`);
    } catch (e) {
      // Column already exists, ignore
    }

    await client.execute(`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id TEXT PRIMARY KEY,
        week_mapping TEXT NOT NULL DEFAULT 'oddA',
        updated_at TEXT NOT NULL
      );
    `);
  }

  return db;
}

export { schema };
