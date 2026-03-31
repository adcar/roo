import 'server-only';
import { getDb, schema } from '@/lib/db';
import { getUserId } from '@/lib/auth-server';
import { eq, and, gte, lte } from 'drizzle-orm';
import { createClient } from '@libsql/client';
import type { Program, WorkoutLog } from '@/types/exercise';

function normalizeExerciseOrder(days: any[]) {
  return days.map(day => ({
    ...day,
    weekA: day.weekA?.map((ex: any, idx: number) => ({ ...ex, order: ex.order ?? idx })) || [],
    weekB: day.weekB?.map((ex: any, idx: number) => ({ ...ex, order: ex.order ?? idx })) || [],
  }));
}

export async function getPrograms(): Promise<Program[]> {
  try {
    const userId = await getUserId();
    const db = getDb();
    const rows = await db
      .select()
      .from(schema.programs)
      .where(eq(schema.programs.userId, userId));

    return rows.map(p => ({
      ...p,
      days: normalizeExerciseOrder(JSON.parse(p.days)),
      isSplit: p.isSplit !== null ? Boolean(p.isSplit) : undefined,
      durationWeeks: p.durationWeeks ?? undefined,
    })) as Program[];
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') return [];
    console.error('Error fetching programs:', error);
    return [];
  }
}

export async function getWorkoutLogs(): Promise<WorkoutLog[]> {
  try {
    const userId = await getUserId();
    const db = getDb();
    const logs = await db
      .select()
      .from(schema.workoutLogs)
      .where(eq(schema.workoutLogs.userId, userId));

    return logs.map(log => ({
      ...log,
      exercises: JSON.parse(log.exercises),
    })) as WorkoutLog[];
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') return [];
    console.error('Error fetching workout logs:', error);
    return [];
  }
}

export async function getWeekMapping(): Promise<'oddA' | 'oddB'> {
  try {
    const userId = await getUserId();
    const db = getDb();
    const settings = await db
      .select()
      .from(schema.userSettings)
      .where(eq(schema.userSettings.userId, userId))
      .limit(1);

    if (settings.length === 0) return 'oddA';
    const wm = settings[0].weekMapping;
    return wm === 'oddA' || wm === 'oddB' ? wm : 'oddA';
  } catch {
    return 'oddA';
  }
}

export async function getInProgressWorkouts(): Promise<Record<string, { week: string; updatedAt: string }>> {
  try {
    const userId = await getUserId();
    const db = getDb();
    const progress = await db
      .select()
      .from(schema.workoutProgress)
      .where(eq(schema.workoutProgress.userId, userId));

    const map: Record<string, { week: string; updatedAt: string }> = {};
    for (const p of progress) {
      map[`${p.programId}-${p.dayId}`] = { week: p.week, updatedAt: p.updatedAt };
    }
    return map;
  } catch {
    return {};
  }
}

/** Fetch programs + weekMapping + inProgress in parallel */
export async function getProgramsPageData() {
  const [programs, weekMapping, inProgress] = await Promise.all([
    getPrograms(),
    getWeekMapping(),
    getInProgressWorkouts(),
  ]);
  return { programs, weekMapping, inProgress };
}

// ---- Leaderboard / Streaks ----

function getISOWeekNumber(date: Date): number {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayNum = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - dayNum);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getWeekKey(date: Date): string {
  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return `${localDate.getFullYear()}-W${getISOWeekNumber(localDate).toString().padStart(2, '0')}`;
}

function getPreviousWeekKey(weekKey: string): string {
  const [yearStr, weekStr] = weekKey.split('-W');
  let year = parseInt(yearStr);
  let weekNum = parseInt(weekStr);
  weekNum--;
  if (weekNum < 1) { weekNum = 52; year--; }
  return `${year}-W${weekNum.toString().padStart(2, '0')}`;
}

function calculateStreaks(workoutDates: string[]): { currentStreak: number; longestStreak: number } {
  if (workoutDates.length === 0) return { currentStreak: 0, longestStreak: 0 };

  const weekMap = new Map<string, number>();
  for (const dateStr of workoutDates) {
    const wk = getWeekKey(new Date(dateStr));
    weekMap.set(wk, (weekMap.get(wk) || 0) + 1);
  }

  const qualifyingWeeks = Array.from(weekMap.entries())
    .filter(([, count]) => count >= 2)
    .map(([wk]) => wk)
    .sort();

  if (qualifyingWeeks.length === 0) return { currentStreak: 0, longestStreak: 0 };

  let longestStreak = 1;
  let run = 1;
  for (let i = 1; i < qualifyingWeeks.length; i++) {
    if (qualifyingWeeks[i - 1] === getPreviousWeekKey(qualifyingWeeks[i])) {
      run++;
      longestStreak = Math.max(longestStreak, run);
    } else {
      run = 1;
    }
  }

  const currentWeekKey = getWeekKey(new Date());
  let checkWeek = getPreviousWeekKey(currentWeekKey);
  let mostRecentQualifying: string | null = null;
  for (let i = 0; i < 52; i++) {
    if (qualifyingWeeks.includes(checkWeek)) { mostRecentQualifying = checkWeek; break; }
    checkWeek = getPreviousWeekKey(checkWeek);
  }

  let currentStreak = 0;
  if (mostRecentQualifying) {
    currentStreak = 1;
    let cw = mostRecentQualifying;
    for (let i = 0; i < 100; i++) {
      const prev = getPreviousWeekKey(cw);
      if (qualifyingWeeks.includes(prev)) { currentStreak++; cw = prev; }
      else break;
    }
  }

  return { currentStreak, longestStreak };
}

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

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const db = getDb();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

    const logs = await db
      .select({ userId: schema.workoutLogs.userId, exercises: schema.workoutLogs.exercises, date: schema.workoutLogs.date })
      .from(schema.workoutLogs)
      .where(and(gte(schema.workoutLogs.date, startOfMonth), lte(schema.workoutLogs.date, endOfMonth)) as any);

    const userWorkoutDays = new Map<string, Set<string>>();
    for (const log of logs) {
      try {
        const exercises = JSON.parse(log.exercises);
        if (Array.isArray(exercises) && exercises.length >= 1) {
          const dayKey = log.date.split('T')[0];
          if (!userWorkoutDays.has(log.userId)) userWorkoutDays.set(log.userId, new Set());
          userWorkoutDays.get(log.userId)!.add(dayKey);
        }
      } catch { /* skip bad data */ }
    }

    const qualifyingUsers = Array.from(userWorkoutDays.entries())
      .filter(([, days]) => days.size >= 1)
      .map(([userId, days]) => ({ userId, count: days.size }));

    if (qualifyingUsers.length === 0) return [];

    const userIds = new Set(qualifyingUsers.map(u => u.userId));
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url) throw new Error('TURSO_DATABASE_URL is not set');
    const client = createClient({ url, authToken });

    // Parallel: fetch users, settings, and all logs for streaks
    const [allUsersResult, allLogsForStreaks] = await Promise.all([
      client.execute({ sql: 'SELECT id, username, email FROM user' }),
      db.select({ userId: schema.workoutLogs.userId, date: schema.workoutLogs.date }).from(schema.workoutLogs),
    ]);

    const userIdsArray = Array.from(userIds);
    const placeholders = userIdsArray.map(() => '?').join(',');
    const settingsResult = userIdsArray.length > 0
      ? await client.execute({ sql: `SELECT user_id, inspiration_quote FROM user_settings WHERE user_id IN (${placeholders})`, args: userIdsArray })
      : { rows: [] };

    const settingsMap = new Map(settingsResult.rows.map((r: any) => [r.user_id as string, r.inspiration_quote as string | null]));
    const userMap = new Map(
      allUsersResult.rows
        .filter((r: any) => userIds.has(r.id))
        .map((r: any) => [r.id as string, { username: r.username as string | null, email: r.email as string, inspirationQuote: settingsMap.get(r.id as string) || null }])
    );

    const userWorkouts = new Map<string, string[]>();
    for (const log of allLogsForStreaks) {
      if (userIds.has(log.userId)) {
        if (!userWorkouts.has(log.userId)) userWorkouts.set(log.userId, []);
        userWorkouts.get(log.userId)!.push(log.date);
      }
    }

    const leaderboard: LeaderboardEntry[] = qualifyingUsers
      .map(({ userId, count }) => {
        const u = userMap.get(userId);
        if (!u) return null;
        const streaks = calculateStreaks(userWorkouts.get(userId) || []);
        return { userId, username: u.username, email: u.email, inspirationQuote: u.inspirationQuote, workoutCount: count, ...streaks, rank: 0 };
      })
      .filter((e): e is LeaderboardEntry => e !== null)
      .sort((a, b) => b.workoutCount - a.workoutCount);

    let currentRank = 1;
    for (let i = 0; i < leaderboard.length; i++) {
      if (i > 0 && leaderboard[i].workoutCount !== leaderboard[i - 1].workoutCount) currentRank = i + 1;
      leaderboard[i].rank = i === 0 ? 1 : currentRank;
    }

    return leaderboard;
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
}
