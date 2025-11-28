'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { useLoading } from '@/components/LoadingProvider';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const { startLoading, stopLoading } = useLoading();

  useEffect(() => {
    if (isPending || (!session && pathname !== '/login')) {
      startLoading();
    } else {
      stopLoading();
    }
  }, [isPending, session, pathname, startLoading, stopLoading]);

  useEffect(() => {
    // Don't redirect if already on login page or if session is still loading
    if (isPending) return;
    
    const isLoginPage = pathname === '/login';
    
    if (!session && !isLoginPage) {
      router.push('/login');
    } else if (session && isLoginPage) {
      router.push('/');
    }
  }, [session, isPending, pathname, router]);

  // Show nothing while checking auth or redirecting
  if (isPending || (!session && pathname !== '/login')) {
    return null;
  }

  return <>{children}</>;
}

