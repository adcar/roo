'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  const [weekMapping, setWeekMapping] = useState<string>('oddA');
  const [inspirationQuote, setInspirationQuote] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch('/api/user-settings');
        if (!response.ok) {
          throw new Error('Failed to fetch settings');
        }
        const data = await response.json();
        setWeekMapping(data.weekMapping || 'oddA');
        setInspirationQuote(data.inspirationQuote || '');
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

    fetchSettings();
  }, []);

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

