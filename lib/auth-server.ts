import { auth } from './auth';
import { headers } from 'next/headers';

/**
 * Get the current session from the request headers
 * Returns null if not authenticated
 */
export async function getSession() {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });
    return session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

/**
 * Get the current user ID from the session
 * Throws an error if not authenticated
 */
export async function getUserId(): Promise<string> {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }
  return session.user.id;
}

