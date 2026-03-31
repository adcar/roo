import 'server-only';
import { auth } from './auth';
import { headers } from 'next/headers';

export async function getSession() {
  try {
    const headersList = await headers();
    return await auth.api.getSession({ headers: headersList });
  } catch {
    return null;
  }
}

export async function getUserId(): Promise<string> {
  const session = await getSession();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session.user.id;
}
