'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dumbbell, BarChart3, Trophy, Settings, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/programs', label: 'Programs', icon: Dumbbell },
  { href: '/exercises', label: 'Exercises', icon: BookOpen },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/leaderboard', label: 'Board', icon: Trophy },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  // Hide nav on workout page and login
  if (pathname?.startsWith('/workout') || pathname === '/login') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-3 text-xs font-medium transition-colors touch-manipulation',
                active
                  ? 'text-[var(--primary)]'
                  : 'text-[var(--muted-foreground)] active:text-[var(--foreground)]'
              )}
            >
              <Icon className="h-6 w-6" strokeWidth={active ? 2.5 : 2} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
