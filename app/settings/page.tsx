'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ThemeToggle } from '@/components/theme-toggle';
import { toast } from '@/components/ui/toast';
import { Loader2, Save, LogOut } from 'lucide-react';

interface Settings {
  weekMapping: string;
  inspirationQuote: string | null;
  availableEquipment: string[] | null;
  weight: string | null;
  height: string | null;
  bodyfatPercentage: string | null;
  gender: number | null;
  age: number | null;
}

const EQUIPMENT_OPTIONS = [
  'barbell', 'dumbbell', 'cable', 'machine', 'kettlebells',
  'bands', 'body only', 'foam roll', 'medicine ball',
  'exercise ball', 'e-z curl bar', 'other',
];

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/user-settings')
      .then(r => r.json())
      .then(d => { setSettings(d.settings || { weekMapping: 'oddA', inspirationQuote: null, availableEquipment: null, weight: null, height: null, bodyfatPercentage: null, gender: null, age: null }); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await fetch('/api/user-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      toast({ title: 'Settings saved', variant: 'success' });
    } catch {
      toast({ title: 'Error saving', variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  const toggleEquipment = (eq: string) => {
    if (!settings) return;
    const current = settings.availableEquipment || [];
    const updated = current.includes(eq) ? current.filter(e => e !== eq) : [...current, eq];
    setSettings({ ...settings, availableEquipment: updated });
  };

  if (loading || !settings) {
    return (
      <div className="flex h-[60dvh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-8 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
        <ThemeToggle />
      </div>

      {/* Body Stats */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <CardTitle>Body Stats</CardTitle>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="weight">Weight</Label>
              <Input id="weight" value={settings.weight || ''} onChange={e => setSettings({ ...settings, weight: e.target.value })} placeholder="e.g. 180 lbs" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="height">Height</Label>
              <Input id="height" value={settings.height || ''} onChange={e => setSettings({ ...settings, height: e.target.value })} placeholder="e.g. 5'10" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="age">Age</Label>
              <Input id="age" type="number" inputMode="numeric" value={settings.age ?? ''} onChange={e => setSettings({ ...settings, age: Number(e.target.value) || null })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bf">Body Fat %</Label>
              <Input id="bf" value={settings.bodyfatPercentage || ''} onChange={e => setSettings({ ...settings, bodyfatPercentage: e.target.value })} placeholder="e.g. 15%" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Gender</Label>
            <Select value={settings.gender?.toString() ?? 'unset'} onValueChange={v => setSettings({ ...settings, gender: v === 'unset' ? null : Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unset">Not specified</SelectItem>
                <SelectItem value="1">Male</SelectItem>
                <SelectItem value="0">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Equipment */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <CardTitle>Available Equipment</CardTitle>
          <p className="text-sm text-[var(--muted-foreground)]">Select equipment you have access to. This filters exercise suggestions.</p>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT_OPTIONS.map(eq => {
              const active = settings.availableEquipment?.includes(eq);
              return (
                <button
                  key={eq}
                  onClick={() => toggleEquipment(eq)}
                  className={`rounded-full px-4 py-2.5 text-sm font-medium transition-colors touch-manipulation ${
                    active
                      ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                      : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                  }`}
                >
                  {eq}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Inspiration Quote */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <CardTitle>Leaderboard Quote</CardTitle>
          <Textarea
            value={settings.inspirationQuote || ''}
            onChange={e => setSettings({ ...settings, inspirationQuote: e.target.value })}
            placeholder="Your inspiration quote for the leaderboard..."
            rows={2}
          />
        </CardContent>
      </Card>

      <Button size="lg" className="w-full" onClick={save} disabled={saving}>
        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="mr-2 h-5 w-5" /> Save Settings</>}
      </Button>

      <Button size="lg" variant="outline" className="w-full" onClick={handleSignOut}>
        <LogOut className="mr-2 h-5 w-5" /> Sign Out
      </Button>
    </div>
  );
}
