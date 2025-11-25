import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

let db: ReturnType<typeof drizzle<typeof schema>>;

export async function getDb() {
  if (!db) {
    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    if (!existsSync(dataDir)) {
      await mkdir(dataDir, { recursive: true });
    }

    const sqlite = new Database(path.join(dataDir, 'workout.db'));
    db = drizzle(sqlite, { schema });

    // Initialize tables
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS programs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        days TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS workout_logs (
        id TEXT PRIMARY KEY,
        program_id TEXT NOT NULL,
        day_id TEXT NOT NULL,
        week TEXT NOT NULL,
        date TEXT NOT NULL,
        exercises TEXT NOT NULL
      );

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
