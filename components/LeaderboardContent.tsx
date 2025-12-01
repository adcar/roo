'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, Users, Flame } from 'lucide-react';
import { useLoading } from '@/components/LoadingProvider';

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

interface LeaderboardContentProps {
  initialLeaderboard: LeaderboardEntry[];
}

function getMedalIcon(position: number) {
  switch (position) {
    case 1:
      return <Trophy className="h-6 w-6 text-yellow-500" />;
    case 2:
      return <Medal className="h-6 w-6 text-gray-400" />;
    case 3:
      return <Award className="h-6 w-6 text-amber-600" />;
    default:
      return null;
  }
}

function getPositionColor(position: number) {
  switch (position) {
    case 1:
      return 'bg-yellow-500/10 border-yellow-500/20';
    case 2:
      return 'bg-gray-400/10 border-gray-400/20';
    case 3:
      return 'bg-amber-600/10 border-amber-600/20';
    default:
      return '';
  }
}

export function LeaderboardContent({ initialLeaderboard }: LeaderboardContentProps) {
  const { startLoading, stopLoading } = useLoading();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(initialLeaderboard);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        startLoading();
        const response = await fetch('/api/leaderboard');
        
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard');
        }
        
        const data = await response.json();
        setLeaderboard(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setError('Failed to load leaderboard. Please try again later.');
      } finally {
        stopLoading();
      }
    }

    fetchLeaderboard();
  }, [startLoading, stopLoading]);

  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <h1 className="text-3xl font-bold mb-6">Leaderboard</h1>
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-destructive text-lg">{error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Leaderboard</h1>
          <p className="text-muted-foreground">
            Top performers for {currentMonth}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Rankings are based on completed workouts. Complete at least 1 workout to appear on the leaderboard.
          </p>
        </div>

        {leaderboard.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground text-lg">
                No one has qualified for the leaderboard this month yet.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Complete at least 1 workout to appear on the leaderboard!
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Monthly Rankings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaderboard.map((entry, index) => {
                  const position = entry.rank;
                  const medalIcon = getMedalIcon(position);
                  const positionColor = getPositionColor(position);
                  
                  return (
                    <div
                      key={entry.userId}
                      className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                        positionColor || 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted font-bold text-lg flex-shrink-0">
                        {medalIcon || position}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-lg truncate">
                            {entry.username || entry.email.split('@')[0]}
                          </div>
                          {entry.currentStreak > 0 && (
                            <div className="flex items-center gap-1" title={`${entry.currentStreak} week streak`}>
                              <Flame className="h-4 w-4 text-orange-500" />
                              <span className="text-xs font-semibold text-orange-500">{entry.currentStreak}</span>
                            </div>
                          )}
                        </div>
                        {entry.inspirationQuote && (
                          <div className="text-sm text-muted-foreground italic mt-1">
                            "{entry.inspirationQuote}"
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right flex-shrink-0">
                        <div className="font-bold text-xl">
                          {entry.workoutCount}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          workout{entry.workoutCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">How it works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              • Any workout counts for the leaderboard - even workouts with just 1 exercise
            </p>
            <p>
              • You need to complete at least 1 workout to appear on the leaderboard
            </p>
            <p>
              • Rankings are updated automatically based on workout logs
            </p>
            <p>
              • The leaderboard resets each month
            </p>
            <p>
              • <strong>Streaks:</strong> Complete 2+ workouts per week to maintain your streak. Any workout counts - even a single exercise like a run! Streaks never reset and last forever. Streaks are tracked across all your workouts and shown publicly!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

