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

    // Initialize tables (idempotent - safe to run multiple times)
    await client.execute(`
      CREATE TABLE IF NOT EXISTS programs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        days TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS workout_logs (
        id TEXT PRIMARY KEY,
        program_id TEXT NOT NULL,
        day_id TEXT NOT NULL,
        week TEXT NOT NULL,
        date TEXT NOT NULL,
        exercises TEXT NOT NULL
      );
    `);

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
        is_custom INTEGER DEFAULT 1
      );
    `);
  }

  return db;
}

export { schema };
