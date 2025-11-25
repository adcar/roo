'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();

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
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}

