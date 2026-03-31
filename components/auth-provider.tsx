'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (pathname === '/login') {
      setChecked(true);
      return;
    }

    authClient.getSession().then(({ data }) => {
      if (!data?.session) {
        router.replace('/login');
      } else {
        setChecked(true);
      }
    });
  }, [pathname, router]);

  if (!checked && pathname !== '/login') {
    return (
      <div className="flex h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
