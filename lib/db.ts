import 'server-only';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

let db: ReturnType<typeof drizzle<typeof schema>>;

export function getDb() {
  if (!db) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url) throw new Error('TURSO_DATABASE_URL is not set');
    const client = createClient({ url, authToken });
    db = drizzle(client, { schema });
  }
  return db;
}

export { schema };
