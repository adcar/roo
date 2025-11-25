'use client';

import { createAuthClient } from 'better-auth/react';
import { usernameClient } from 'better-auth/client/plugins';

// Create auth client with proper base URL
// Better Auth requires a full URL, so we construct it from window.location in the browser
const getBaseURL = () => {
  if (typeof window === 'undefined') {
    // During SSR, use environment variable or default
    return process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:6050/api/auth';
  }
  // In browser, construct full URL from current origin
  return `${window.location.origin}/api/auth`;
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [
    usernameClient(),
  ],
});

// Export methods directly from the client
export const signIn = authClient.signIn;
export const signOut = authClient.signOut;

