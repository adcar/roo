'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { ClipboardList, Dumbbell, BarChart3, Monitor, Moon, Sun, LogOut, ChevronDown } from 'lucide-react';
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

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine active tab based on pathname
  const activeTab = pathname === '/exercises' ? 'exercises' : pathname === '/analytics' ? 'analytics' : 'programs';

  const handleTabChange = (value: string) => {
    if (value === 'programs') {
      router.push('/');
    } else if (value === 'exercises') {
      router.push('/exercises');
    } else if (value === 'analytics') {
      router.push('/analytics');
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
    <div className="border-b">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <img 
              src="/logo.svg" 
              alt="'Roo Logo" 
              className="h-16 w-16"
            />
            <h1 className="text-3xl font-bold">’Roo</h1>
          </div>
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
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="programs" className="cursor-pointer">
              <ClipboardList className="mr-2 h-4 w-4" />
              Programs
            </TabsTrigger>
            <TabsTrigger value="exercises" className="cursor-pointer">
              <Dumbbell className="mr-2 h-4 w-4" />
              Exercise Library
            </TabsTrigger>
            <TabsTrigger value="analytics" className="cursor-pointer">
              <BarChart3 className="mr-2 h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
