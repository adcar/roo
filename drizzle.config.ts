import { defineConfig } from 'drizzle-kit';

// For Turso, migrations are typically handled via Turso CLI or the dashboard
// This config is mainly for local development with a local SQLite file
export default defineConfig({
  schema: './lib/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL || 'file:./data/workout.db',
  },
});
