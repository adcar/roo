'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Dumbbell } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    setError('');

    try {
      const result = await signIn.username({ username, password });
      if (result.error) {
        setError(result.error.message || 'Login failed');
      } else {
        router.replace('/programs');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center gap-3 pb-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary)]">
            <Dumbbell className="h-8 w-8 text-[var(--primary-foreground)]" />
          </div>
          <CardTitle className="text-2xl">Welcome to Roo</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>
            {error && (
              <p className="text-sm text-[var(--destructive)]">{error}</p>
            )}
            <Button type="submit" size="lg" disabled={loading || !username || !password}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
