import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { username } from 'better-auth/plugins';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as authSchema from './auth-schema';

// Create a separate database client for auth
function getAuthDb() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error('TURSO_DATABASE_URL environment variable is not set');
  }

  const client = createClient({
    url,
    authToken,
  });

  return drizzle(client, { schema: authSchema });
}

export const auth = betterAuth({
  database: drizzleAdapter(getAuthDb(), {
    provider: 'sqlite',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // No email verification needed
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  trustedOrigins: [
    'http://localhost:6050',
    'http://127.0.0.1:6050',
    'http://192.168.50.110:6050', // Local network IP for phone access
  ],
  plugins: [
    username(), // Enable username plugin for username/password login
  ],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;

