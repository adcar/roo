'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { Settings, Flame } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { authClient } from '@/lib/auth-client';

export default function SettingsPage() {
  const [weekMapping, setWeekMapping] = useState<string>('oddA');
  const [inspirationQuote, setInspirationQuote] = useState<string>('');
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [longestStreak, setLongestStreak] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { data: session } = authClient.useSession();

  useEffect(() => {
    async function fetchSettings() {
      try {
        const userId = session?.user?.id;
        
        const [settingsResponse, streaksResponse] = await Promise.all([
          fetch('/api/user-settings'),
          userId ? fetch(`/api/streaks?userId=${userId}`) : Promise.resolve(null),
        ]);
        
        if (!settingsResponse.ok) {
          throw new Error('Failed to fetch settings');
        }
        const settingsData = await settingsResponse.json();
        setWeekMapping(settingsData.weekMapping || 'oddA');
        setInspirationQuote(settingsData.inspirationQuote || '');
        
        if (streaksResponse && streaksResponse.ok) {
          const streaksData = await streaksResponse.json();
          setCurrentStreak(streaksData.currentStreak || 0);
          setLongestStreak(streaksData.longestStreak || 0);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast('Failed to load settings', {
          description: 'Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    if (session) {
      fetchSettings();
    }
  }, [session]);

  async function handleSave() {
    try {
      setSaving(true);
      const response = await fetch('/api/user-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weekMapping,
          inspirationQuote: inspirationQuote.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      toast('Settings saved', {
        description: 'Your settings have been updated.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast('Failed to save settings', {
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-2xl">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Week Mapping</CardTitle>
              <CardDescription>
                Configure how weeks are mapped to your programs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="weekMapping">Week Mapping</Label>
                <Select value={weekMapping} onValueChange={setWeekMapping}>
                  <SelectTrigger id="weekMapping">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oddA">Odd Weeks = Week A</SelectItem>
                    <SelectItem value="oddB">Odd Weeks = Week B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                Workout Streak
              </CardTitle>
              <CardDescription>
                Track your consistency - maintain 2+ workouts per week to keep your streak alive! Any workout counts, even a single exercise like a run. Streaks never reset and last forever.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold text-orange-500">{currentStreak}</div>
                  <div className="text-sm text-muted-foreground mt-1">Current Streak</div>
                  <div className="text-xs text-muted-foreground mt-1">weeks</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold">{longestStreak}</div>
                  <div className="text-sm text-muted-foreground mt-1">Longest Streak</div>
                  <div className="text-xs text-muted-foreground mt-1">weeks</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4 text-center">
                Complete at least 2 workouts per week to maintain your streak. Any workout counts - even a single exercise! Streaks never reset and last forever. Streaks are public on the leaderboard!
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Leaderboard</CardTitle>
              <CardDescription>
                Set a custom inspiration quote to display on the leaderboard (optional)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inspirationQuote">Inspiration Quote</Label>
                <Textarea
                  id="inspirationQuote"
                  placeholder="Enter your inspiration quote (e.g., 'No pain, no gain!' or 'Every rep counts!')"
                  value={inspirationQuote}
                  onChange={(e) => setInspirationQuote(e.target.value)}
                  rows={3}
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground">
                  {inspirationQuote.length}/200 characters. Leave empty to show nothing on the leaderboard.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

