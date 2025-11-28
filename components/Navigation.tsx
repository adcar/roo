'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { ClipboardList, Dumbbell, BarChart3, Trophy, Monitor, Moon, Sun, LogOut, ChevronDown, Settings, Apple } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

// Mobile bottom nav items (excluding exercises - moved to dropdown menu)
const navItems = [
  { value: 'programs', route: '/programs', icon: ClipboardList, label: 'Programs' },
  { value: 'analytics', route: '/analytics', icon: BarChart3, label: 'Analytics' },
  { value: 'leaderboard', route: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { value: 'nutrition', route: '/nutrition', icon: Apple, label: 'Nutrition' },
];

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Prefetch all navigation routes for faster navigation
    navItems.forEach((item) => {
      router.prefetch(item.route);
    });
  }, [router]);

  // Determine active tab based on pathname
  // Only highlight tabs on their specific routes, not on other pages like /settings
  const activeTab = pathname === '/analytics' ? 'analytics' 
    : pathname === '/leaderboard' ? 'leaderboard'
    : pathname === '/nutrition' ? 'nutrition'
    : pathname === '/programs' || pathname.startsWith('/programs/') ? 'programs'
    : undefined;

  const handleTabChange = (value: string) => {
    if (value === 'programs') {
      router.push('/programs');
    } else if (value === 'analytics') {
      router.push('/analytics');
    } else if (value === 'leaderboard') {
      router.push('/leaderboard');
    } else if (value === 'nutrition') {
      router.push('/nutrition');
    }
  };

  const triggerHapticFeedback = () => {
    // Check if Vibration API is available (mobile devices)
    if ('vibrate' in navigator) {
      navigator.vibrate(10); // Short vibration (10ms)
    }
  };

  async function handleLogout() {
    await authClient.signOut();
    router.push('/login');
    router.refresh();
  }

  // Don't show navigation on login page
  if (pathname === '/login') {
    return null;
  }

  return (
    <>
      {/* Top Navigation - Header with tabs on desktop */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
              <img 
                src="/logo.svg" 
                alt="'Roo Logo" 
                className="h-16 w-16"
              />
              <h1 className="text-3xl font-bold">'Roo</h1>
            </Link>
            {session?.user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {session.user.username || session.user.email}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {mounted && (
                    <>
                      <DropdownMenuItem onClick={() => setTheme('light')}>
                        <Sun className="mr-2 h-4 w-4" />
                        <span>Light</span>
                        {theme === 'light' && <span className="ml-auto">✓</span>}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme('dark')}>
                        <Moon className="mr-2 h-4 w-4" />
                        <span>Dark</span>
                        {theme === 'dark' && <span className="ml-auto">✓</span>}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme('system')}>
                        <Monitor className="mr-2 h-4 w-4" />
                        <span>System</span>
                        {theme === 'system' && <span className="ml-auto">✓</span>}
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/exercises')}>
                    <Dumbbell className="mr-2 h-4 w-4" />
                    <span>Exercise Library</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          {/* Desktop Tabs - hidden on mobile */}
          <div className="hidden md:block">
            <Tabs value={activeTab || ''} onValueChange={handleTabChange}>
              <TabsList>
                <TabsTrigger value="programs" className="cursor-pointer">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Programs
                </TabsTrigger>
                <TabsTrigger value="analytics" className="cursor-pointer">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="leaderboard" className="cursor-pointer">
                  <Trophy className="mr-2 h-4 w-4" />
                  Leaderboard
                </TabsTrigger>
                <TabsTrigger value="nutrition" className="cursor-pointer">
                  <Apple className="mr-2 h-4 w-4" />
                  Nutrition
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Bottom Navigation - Mobile/Tablet only */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.value;
            return (
              <Link
                key={item.value}
                href={item.route}
                prefetch={true}
                onClick={() => triggerHapticFeedback()}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  isActive 
                    ? 'text-primary' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
