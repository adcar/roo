'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Flame, Dumbbell } from 'lucide-react';

interface LeaderboardEntry {
  userId: string;
  username: string | null;
  email: string;
  inspirationQuote: string | null;
  workoutCount: number;
  currentStreak: number;
  longestStreak: number;
  rank: number;
}

export function LeaderboardContent({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12">
          <Trophy className="h-12 w-12 text-[var(--muted-foreground)] mb-3" />
          <p className="text-[var(--muted-foreground)]">No one on the leaderboard yet this month.</p>
          <p className="text-sm text-[var(--muted-foreground)]">Start working out to appear here!</p>
        </CardContent>
      </Card>
    );
  }

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="space-y-3">
      {entries.map(entry => (
        <Card key={entry.userId}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--muted)] text-lg font-bold shrink-0">
                {getRankEmoji(entry.rank)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{entry.username || entry.email.split('@')[0]}</p>
                {entry.inspirationQuote && (
                  <p className="text-xs text-[var(--muted-foreground)] italic truncate mt-0.5">{entry.inspirationQuote}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="secondary" className="gap-1">
                    <Dumbbell className="h-3 w-3" /> {entry.workoutCount} workouts
                  </Badge>
                  {entry.currentStreak > 0 && (
                    <Badge variant="secondary" className="gap-1">
                      <Flame className="h-3 w-3" /> {entry.currentStreak}w streak
                    </Badge>
                  )}
                  {entry.longestStreak > 0 && entry.longestStreak !== entry.currentStreak && (
                    <Badge variant="outline" className="gap-1 text-xs">
                      Best: {entry.longestStreak}w
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
