'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { WorkoutLog, Program } from '@/types/exercise';
import { useExercises } from '@/hooks/use-exercises';
import { format, subDays, startOfWeek, isWithinInterval } from 'date-fns';

interface Props {
  logs: WorkoutLog[];
  programs: Program[];
}

export function AnalyticsContent({ logs, programs }: Props) {
  const { exercises } = useExercises();
  const getExName = (id: string) => {
    const ex = exercises.find(e => e.id === id);
    return ex?.name || id.replace(/_/g, ' ');
  };
  const stats = useMemo(() => {
    if (!logs.length) return null;

    const totalWorkouts = logs.length;
    const totalSets = logs.reduce((acc, log) => acc + log.exercises.reduce((a, e) => a + e.sets.filter(s => s.completed).length, 0), 0);
    const totalVolume = logs.reduce((acc, log) =>
      acc + log.exercises.reduce((a, e) =>
        a + e.sets.filter(s => s.completed).reduce((v, s) => v + ((s.weight || 0) * (s.reps || 0)), 0), 0), 0);

    // This week
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const thisWeek = logs.filter(l => new Date(l.date) >= weekStart).length;

    // Last 30 days per week
    const last30 = logs.filter(l => {
      const d = new Date(l.date);
      return isWithinInterval(d, { start: subDays(new Date(), 30), end: new Date() });
    });

    // Exercise frequency
    const exFreq = new Map<string, number>();
    logs.forEach(log => log.exercises.forEach(e => exFreq.set(e.exerciseId, (exFreq.get(e.exerciseId) || 0) + 1)));
    const topExercises = Array.from(exFreq.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Calendar data (last 90 days)
    const calendarData = new Map<string, number>();
    logs.forEach(log => {
      const key = log.date.split('T')[0];
      calendarData.set(key, (calendarData.get(key) || 0) + 1);
    });

    return { totalWorkouts, totalSets, totalVolume, thisWeek, last30: last30.length, topExercises, calendarData };
  }, [logs]);

  if (!stats) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12">
          <p className="text-[var(--muted-foreground)]">No workout data yet. Start logging workouts to see analytics.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{stats.totalWorkouts}</p>
            <p className="text-sm text-[var(--muted-foreground)]">Total Workouts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{stats.thisWeek}</p>
            <p className="text-sm text-[var(--muted-foreground)]">This Week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{stats.totalSets.toLocaleString()}</p>
            <p className="text-sm text-[var(--muted-foreground)]">Total Sets</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{(stats.totalVolume / 1000).toFixed(0)}k</p>
            <p className="text-sm text-[var(--muted-foreground)]">Volume (lbs)</p>
          </CardContent>
        </Card>
      </div>

      {/* Last 30 days */}
      <Card>
        <CardContent className="p-5">
          <CardTitle className="mb-3">Last 30 Days</CardTitle>
          <p className="text-4xl font-bold">{stats.last30}</p>
          <p className="text-sm text-[var(--muted-foreground)]">workouts</p>
        </CardContent>
      </Card>

      {/* Workout Calendar (last 90 days) */}
      <ActivityGrid calendarData={stats.calendarData} />

      {/* Top Exercises */}
      {stats.topExercises.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <CardTitle className="mb-3">Most Performed</CardTitle>
            <div className="space-y-3">
              {stats.topExercises.map(([exId, count], i) => (
                  <div key={exId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[var(--muted-foreground)] w-5">{i + 1}</span>
                      <span className="text-sm font-medium truncate">{getExName(exId)}</span>
                    </div>
                    <Badge variant="secondary">{count}x</Badge>
                  </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ActivityGrid({ calendarData }: { calendarData: Map<string, number> }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <CardTitle>Activity</CardTitle>
          <span className="text-xs text-[var(--muted-foreground)]">Last 90 days</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 90 }, (_, i) => {
            const d = subDays(new Date(), 89 - i);
            const key = format(d, 'yyyy-MM-dd');
            const count = calendarData.get(key) || 0;
            return (
              <div
                key={key}
                className="h-4 w-4 rounded-sm"
                style={{
                  backgroundColor: count > 0
                    ? `oklch(0.55 0.17 145 / ${Math.min(1, 0.35 + count * 0.32)})`
                    : 'var(--muted)',
                }}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

