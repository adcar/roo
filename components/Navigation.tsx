'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();

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
          <h1 className="text-3xl font-bold">🦘 ’Roo</h1>
          <div className="flex items-center gap-4">
            {session?.user && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {session.user.username || session.user.email}
                </span>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Sign out
                </Button>
              </div>
            )}
            <ThemeToggle />
          </div>
        </div>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="programs" className="cursor-pointer">Programs</TabsTrigger>
            <TabsTrigger value="exercises" className="cursor-pointer">Exercise Library</TabsTrigger>
            <TabsTrigger value="analytics" className="cursor-pointer">Analytics</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
