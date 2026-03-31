'use client';

import { createAuthClient } from 'better-auth/react';
import { usernameClient } from 'better-auth/client/plugins';

const getBaseURL = () => {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:6051/api/auth';
  }
  return `${window.location.origin}/api/auth`;
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [usernameClient()],
});

export const signIn = authClient.signIn;
export const signOut = authClient.signOut;
