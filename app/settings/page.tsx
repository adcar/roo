'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/toast';
import { Settings, Flame } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { authClient } from '@/lib/auth-client';
import { useLoading } from '@/components/LoadingProvider';

const ALWAYS_ENABLED_EQUIPMENT = ['body only', 'other'];

const SELECTABLE_EQUIPMENT_OPTIONS = [
  'dumbbell',
  'barbell',
  'kettlebells',
  'cable',
  'machine',
  'bands',
  'medicine ball',
  'exercise ball',
  'foam roll',
  'e-z curl bar',
];

export default function SettingsPage() {
  const { startLoading, stopLoading } = useLoading();
  const [weekMapping, setWeekMapping] = useState<string>('oddA');
  const [inspirationQuote, setInspirationQuote] = useState<string>('');
  const [availableEquipment, setAvailableEquipment] = useState<string[]>([]);
  const [weight, setWeight] = useState<number | ''>('');
  const [heightFeet, setHeightFeet] = useState<number | ''>('');
  const [heightInches, setHeightInches] = useState<number | ''>('');
  const [bodyfatPercentage, setBodyfatPercentage] = useState<number | ''>('');
  const [gender, setGender] = useState<'male' | 'female' | 'none'>('none');
  const [age, setAge] = useState<number | ''>('');
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [longestStreak, setLongestStreak] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const { data: session } = authClient.useSession();

  useEffect(() => {
    async function fetchSettings() {
      try {
        startLoading();
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
        setAvailableEquipment(settingsData.availableEquipment || []);
        
        // Parse weight (remove "lbs" suffix)
        const weightValue = settingsData.weight || '';
        const weightNum = weightValue.replace(/\s*lbs$/i, '');
        setWeight(weightNum ? parseFloat(weightNum) : '');
        
        // Parse height (format: "5'11"", "5'11", etc.)
        const heightValue = settingsData.height || '';
        if (heightValue) {
          // Match pattern like "5'11" or "5'11\""
          const match = heightValue.match(/(\d+)['\s](\d+)/);
          if (match) {
            setHeightFeet(parseInt(match[1]));
            setHeightInches(parseInt(match[2]));
          } else {
            // Try to find just feet if no inches format found
            const feetOnly = heightValue.match(/(\d+)/);
            if (feetOnly) {
              setHeightFeet(parseInt(feetOnly[1]));
              setHeightInches('');
            } else {
              setHeightFeet('');
              setHeightInches('');
            }
          }
        } else {
          setHeightFeet('');
          setHeightInches('');
        }
        
        // Parse body fat (remove "%" suffix)
        const bodyfatValue = settingsData.bodyfatPercentage || '';
        const bodyfatNum = bodyfatValue.replace('%', '');
        setBodyfatPercentage(bodyfatNum ? parseFloat(bodyfatNum) : '');
        
        // Parse gender (0 = female, 1 = male, null = not specified)
        if (settingsData.gender === 1) {
          setGender('male');
        } else if (settingsData.gender === 0) {
          setGender('female');
        } else {
          setGender('none');
        }
        
        // Parse age
        setAge(settingsData.age !== null && settingsData.age !== undefined ? settingsData.age : '');
        
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
        stopLoading();
      }
    }

    if (session) {
      fetchSettings();
    }
  }, [session]);

  async function handleSave() {
    try {
      setSaving(true);
      
      // Format values for storage
      const formattedWeight = weight !== '' ? `${weight} lbs` : null;
      const formattedHeight = (heightFeet !== '' || heightInches !== '') 
        ? `${heightFeet || 0}'${heightInches || 0}"`
        : null;
      const formattedBodyfat = bodyfatPercentage !== '' ? `${bodyfatPercentage}%` : null;
      const formattedGender = gender === 'none' ? null : gender;
      const formattedAge = age !== '' && !isNaN(age as number) ? age : null;

      const response = await fetch('/api/user-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weekMapping,
          inspirationQuote: inspirationQuote.trim() || null,
          availableEquipment,
          weight: formattedWeight,
          height: formattedHeight,
          bodyfatPercentage: formattedBodyfat,
          gender: formattedGender,
          age: formattedAge,
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
              <CardTitle>Available Equipment</CardTitle>
              <CardDescription>
                Select the equipment you have available. Exercise search results will be filtered to only show exercises you can do with your equipment. Bodyweight and "other" exercises are always included.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {/* Always enabled equipment (disabled checkboxes) */}
                {ALWAYS_ENABLED_EQUIPMENT.map((equipment) => (
                  <div key={equipment} className="flex items-center space-x-2">
                    <Checkbox
                      id={`equipment-${equipment}`}
                      checked={true}
                      disabled
                    />
                    <label
                      htmlFor={`equipment-${equipment}`}
                      className="text-sm font-medium leading-none capitalize text-muted-foreground cursor-not-allowed"
                    >
                      {equipment}
                    </label>
                  </div>
                ))}
                {/* Selectable equipment */}
                {SELECTABLE_EQUIPMENT_OPTIONS.map((equipment) => (
                  <div key={equipment} className="flex items-center space-x-2">
                    <Checkbox
                      id={`equipment-${equipment}`}
                      checked={availableEquipment.includes(equipment)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setAvailableEquipment([...availableEquipment, equipment]);
                        } else {
                          setAvailableEquipment(availableEquipment.filter(eq => eq !== equipment));
                        }
                      }}
                    />
                    <label
                      htmlFor={`equipment-${equipment}`}
                      className="text-sm font-medium leading-none cursor-pointer capitalize"
                    >
                      {equipment}
                    </label>
                  </div>
                ))}
              </div>
              {availableEquipment.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No additional equipment selected. Only bodyweight and "other" exercises will be shown in search results.
                </p>
              )}
              {availableEquipment.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-muted-foreground">Selected:</span>
                  {ALWAYS_ENABLED_EQUIPMENT.map((eq) => (
                    <Badge key={eq} variant="secondary" className="text-xs capitalize opacity-60">
                      {eq} (always)
                    </Badge>
                  ))}
                  {availableEquipment.map((eq) => (
                    <Badge key={eq} variant="secondary" className="text-xs capitalize">
                      {eq}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Your physical stats help AI generate personalized workout programs (optional)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (lbs)</Label>
                  <Input
                    id="weight"
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="e.g., 165"
                    value={weight}
                    onChange={(e) => {
                      const value = e.target.value === '' ? '' : parseFloat(e.target.value);
                      setWeight(value === '' || isNaN(value) ? '' : value);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Height</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Input
                        id="heightFeet"
                        type="number"
                        min="0"
                        max="8"
                        placeholder="Feet"
                        value={heightFeet}
                        onChange={(e) => {
                          const value = e.target.value === '' ? '' : parseInt(e.target.value);
                          setHeightFeet(value === '' || isNaN(value) ? '' : value);
                        }}
                      />
                    </div>
                    <span className="text-muted-foreground">'</span>
                    <div className="flex-1">
                      <Input
                        id="heightInches"
                        type="number"
                        min="0"
                        max="11"
                        placeholder="Inches"
                        value={heightInches}
                        onChange={(e) => {
                          const value = e.target.value === '' ? '' : parseInt(e.target.value);
                          setHeightInches(value === '' || isNaN(value) ? '' : value);
                        }}
                      />
                    </div>
                    <span className="text-muted-foreground">"</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bodyfatPercentage">Body Fat %</Label>
                  <Input
                    id="bodyfatPercentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="e.g., 15"
                    value={bodyfatPercentage}
                    onChange={(e) => {
                      const value = e.target.value === '' ? '' : parseFloat(e.target.value);
                      setBodyfatPercentage(value === '' || isNaN(value) ? '' : value);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={gender} onValueChange={(value) => setGender(value as 'male' | 'female' | 'none')}>
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Select gender (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not specified</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    min="1"
                    max="150"
                    placeholder="e.g., 30"
                    value={age}
                    onChange={(e) => {
                      const value = e.target.value === '' ? '' : parseInt(e.target.value);
                      setAge(value === '' || isNaN(value) ? '' : value);
                    }}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                These values are optional and used to help AI generate more personalized workout programs.
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

