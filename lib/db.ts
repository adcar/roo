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

    // Try to add is_split column if it doesn't exist (migration)
    try {
      const tableInfo = await client.execute(`PRAGMA table_info(programs);`);
      const hasIsSplit = tableInfo.rows.some((row: any) => row.name === 'is_split');
      if (!hasIsSplit) {
        await client.execute(`ALTER TABLE programs ADD COLUMN is_split INTEGER;`);
        // Existing programs default to true (1) for backward compatibility
        await client.execute(`UPDATE programs SET is_split = 1 WHERE is_split IS NULL;`);
      }
    } catch (e) {
      // Column already exists or table doesn't exist yet, ignore
    }

    // Try to add duration_weeks column if it doesn't exist (migration)
    try {
      const tableInfo = await client.execute(`PRAGMA table_info(programs);`);
      const hasDurationWeeks = tableInfo.rows.some((row: any) => row.name === 'duration_weeks');
      if (!hasDurationWeeks) {
        await client.execute(`ALTER TABLE programs ADD COLUMN duration_weeks INTEGER;`);
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
        inspiration_quote TEXT,
        updated_at TEXT NOT NULL
      );
    `);

    // Try to add inspiration_quote column if it doesn't exist (migration)
    try {
      const tableInfo = await client.execute(`PRAGMA table_info(user_settings);`);
      const hasInspirationQuote = tableInfo.rows.some((row: any) => row.name === 'inspiration_quote');
      if (!hasInspirationQuote) {
        await client.execute(`ALTER TABLE user_settings ADD COLUMN inspiration_quote TEXT;`);
      }
    } catch (e) {
      // Column already exists or table doesn't exist yet, ignore
    }

    // Try to add available_equipment column if it doesn't exist (migration)
    try {
      const tableInfo = await client.execute(`PRAGMA table_info(user_settings);`);
      const hasAvailableEquipment = tableInfo.rows.some((row: any) => row.name === 'available_equipment');
      if (!hasAvailableEquipment) {
        await client.execute(`ALTER TABLE user_settings ADD COLUMN available_equipment TEXT;`);
      }
    } catch (e) {
      // Column already exists or table doesn't exist yet, ignore
    }

    // Try to add weight, height, bodyfat_percentage, gender, age columns if they don't exist (migration)
    try {
      const tableInfo = await client.execute(`PRAGMA table_info(user_settings);`);
      const hasWeight = tableInfo.rows.some((row: any) => row.name === 'weight');
      const hasHeight = tableInfo.rows.some((row: any) => row.name === 'height');
      const hasBodyfat = tableInfo.rows.some((row: any) => row.name === 'bodyfat_percentage');
      const hasGender = tableInfo.rows.some((row: any) => row.name === 'gender');
      const hasAge = tableInfo.rows.some((row: any) => row.name === 'age');
      
      if (!hasWeight) {
        await client.execute(`ALTER TABLE user_settings ADD COLUMN weight TEXT;`);
      }
      if (!hasHeight) {
        await client.execute(`ALTER TABLE user_settings ADD COLUMN height TEXT;`);
      }
      if (!hasBodyfat) {
        await client.execute(`ALTER TABLE user_settings ADD COLUMN bodyfat_percentage TEXT;`);
      }
      if (!hasGender) {
        await client.execute(`ALTER TABLE user_settings ADD COLUMN gender INTEGER;`);
      }
      if (!hasAge) {
        await client.execute(`ALTER TABLE user_settings ADD COLUMN age INTEGER;`);
      }
    } catch (e) {
      // Column already exists or table doesn't exist yet, ignore
    }

    // Initialize nutrition tables
    await client.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        product_data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS food_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        items TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS food_log_entries (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS food_log_items (
        id TEXT PRIMARY KEY,
        log_entry_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        quantity TEXT NOT NULL,
        meal_type TEXT,
        created_at TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS user_foods (
        user_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (user_id, product_id)
      );
    `);

    // Migration: Populate user_foods from existing food log items for backward compatibility
    // This is a one-time migration that runs if the table is empty
    try {
      const userFoodsCount = await client.execute(`SELECT COUNT(*) as count FROM user_foods`);
      const count = (userFoodsCount.rows[0] as any)?.count || 0;
      
      if (count === 0) {
        // Table is empty, migrate existing food log items
        await client.execute(`
          INSERT OR IGNORE INTO user_foods (user_id, product_id, created_at)
          SELECT DISTINCT 
            fle.user_id,
            fli.product_id,
            MIN(fli.created_at) as created_at
          FROM food_log_items fli
          INNER JOIN food_log_entries fle ON fli.log_entry_id = fle.id
          GROUP BY fle.user_id, fli.product_id
        `);
      }
    } catch (e) {
      // Migration failed, but that's okay - it will populate naturally as users add foods
      console.log('Migration note: user_foods will populate as users add foods to their logs');
    }
  }

  return db;
}

export { schema };
