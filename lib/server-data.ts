import { getDb, schema } from '@/lib/db';
import { getUserId } from '@/lib/auth-server';
import { eq, and, gte, lte } from 'drizzle-orm';
import { Program, WorkoutLog } from '@/types/exercise';
import { createClient } from '@libsql/client';

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
    const db = await getDb();
    const allPrograms = await db
      .select()
      .from(schema.programs)
      .where(eq(schema.programs.userId, userId));

    const programs = allPrograms.map(p => {
      const days = JSON.parse(p.days);
      return {
        ...p,
        days: normalizeExerciseOrder(days),
        isSplit: p.isSplit !== null ? Boolean(p.isSplit) : undefined,
      };
    });

    return programs as Program[];
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return [];
    }
    console.error('Error fetching programs:', error);
    return [];
  }
}

export async function getWorkoutLogs(): Promise<WorkoutLog[]> {
  try {
    const userId = await getUserId();
    const db = await getDb();
    const logs = await db
      .select()
      .from(schema.workoutLogs)
      .where(eq(schema.workoutLogs.userId, userId));

    return logs.map(log => ({
      ...log,
      exercises: JSON.parse(log.exercises),
    })) as WorkoutLog[];
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return [];
    }
    console.error('Error fetching workout logs:', error);
    return [];
  }
}

export async function getWeekMapping(): Promise<'oddA' | 'oddB'> {
  try {
    const userId = await getUserId();
    const db = await getDb();
    const settings = await db
      .select()
      .from(schema.userSettings)
      .where(eq(schema.userSettings.userId, userId))
      .limit(1);

    if (settings.length === 0) {
      return 'oddA';
    }

    return (settings[0].weekMapping === 'oddA' || settings[0].weekMapping === 'oddB') 
      ? settings[0].weekMapping 
      : 'oddA';
  } catch (error) {
    return 'oddA';
  }
}

export async function getInProgressWorkouts(): Promise<Record<string, { week: string; updatedAt: string }>> {
  try {
    const userId = await getUserId();
    const db = await getDb();
    const progress = await db
      .select()
      .from(schema.workoutProgress)
      .where(eq(schema.workoutProgress.userId, userId));

    const progressMap: Record<string, { week: string; updatedAt: string }> = {};
    progress.forEach(p => {
      const key = `${p.programId}-${p.dayId}`;
      progressMap[key] = { week: p.week, updatedAt: p.updatedAt };
    });

    return progressMap;
  } catch (error) {
    return {};
  }
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

// Streak calculation helpers
function getISOWeekNumber(date: Date): number {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayNum = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - dayNum);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getWeekKey(date: Date): string {
  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const year = localDate.getFullYear();
  const weekNum = getISOWeekNumber(localDate);
  return `${year}-W${weekNum.toString().padStart(2, '0')}`;
}

function getPreviousWeekKey(weekKey: string): string {
  const [yearStr, weekStr] = weekKey.split('-W');
  let year = parseInt(yearStr);
  let weekNum = parseInt(weekStr);
  
  weekNum--;
  if (weekNum < 1) {
    weekNum = 52;
    year--;
  }
  
  return `${year}-W${weekNum.toString().padStart(2, '0')}`;
}

function calculateStreaks(workoutDates: string[]): { currentStreak: number; longestStreak: number } {
  if (workoutDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const weekMap = new Map<string, number>();
  
  workoutDates.forEach(dateStr => {
    const date = new Date(dateStr);
    const weekKey = getWeekKey(date);
    weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + 1);
  });

  const qualifyingWeeks = Array.from(weekMap.entries())
    .filter(([_, count]) => count >= 2)
    .map(([weekKey, _]) => weekKey)
    .sort();

  if (qualifyingWeeks.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Calculate longest streak
  let longestStreak = 1;
  let currentLongest = 1;
  
  for (let i = 1; i < qualifyingWeeks.length; i++) {
    const prevWeek = qualifyingWeeks[i - 1];
    const currWeek = qualifyingWeeks[i];
    const expectedPrevWeek = getPreviousWeekKey(currWeek);
    
    if (prevWeek === expectedPrevWeek) {
      currentLongest++;
      longestStreak = Math.max(longestStreak, currentLongest);
    } else {
      currentLongest = 1;
    }
  }

  // Calculate current streak
  const today = new Date();
  const currentWeekKey = getWeekKey(today);
  const currentWeekCount = weekMap.get(currentWeekKey) || 0;
  
  // Find the most recent completed qualifying week (exclude current week)
  let mostRecentQualifyingWeek: string | null = null;
  
  let checkWeek = getPreviousWeekKey(currentWeekKey);
  for (let i = 0; i < 52; i++) {
    if (qualifyingWeeks.includes(checkWeek)) {
      mostRecentQualifyingWeek = checkWeek;
      break;
    }
    checkWeek = getPreviousWeekKey(checkWeek);
  }

  let currentStreak = 0;
  
  if (mostRecentQualifyingWeek) {
    currentStreak = 1;
    let checkWeek = mostRecentQualifyingWeek;
    
    for (let i = 0; i < 100; i++) {
      const prevWeek = getPreviousWeekKey(checkWeek);
      if (qualifyingWeeks.includes(prevWeek)) {
        currentStreak++;
        checkWeek = prevWeek;
      } else {
        break;
      }
    }
  }

  return { currentStreak, longestStreak };
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const db = await getDb();
    
    // Get start and end of current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const startOfMonthISO = startOfMonth.toISOString();
    const endOfMonthISO = endOfMonth.toISOString();

    // Fetch all workout logs for current month
    const logs = await db
      .select({
        userId: schema.workoutLogs.userId,
        exercises: schema.workoutLogs.exercises,
      })
      .from(schema.workoutLogs)
      .where(
        and(
          gte(schema.workoutLogs.date, startOfMonthISO),
          lte(schema.workoutLogs.date, endOfMonthISO)
        ) as any
      );

    // Count all workouts per user (any workout counts, even with just 1 exercise)
    const userWorkoutCounts = new Map<string, number>();
    
    for (const log of logs) {
      try {
        const exercises = JSON.parse(log.exercises);
        // Any workout counts for the leaderboard (even with just 1 exercise)
        if (Array.isArray(exercises) && exercises.length >= 1) {
          const currentCount = userWorkoutCounts.get(log.userId) || 0;
          userWorkoutCounts.set(log.userId, currentCount + 1);
        }
      } catch (e) {
        console.error('Error parsing exercises:', e);
      }
    }

    // Filter users with at least 1 qualifying workout
    const qualifyingUsers = Array.from(userWorkoutCounts.entries())
      .filter(([_, count]) => count >= 1)
      .map(([userId, count]) => ({ userId, count }));

    if (qualifyingUsers.length === 0) {
      return [];
    }

    // Fetch user details for qualifying users
    const userIds = new Set(qualifyingUsers.map(u => u.userId));
    
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    
    if (!url) {
      throw new Error('TURSO_DATABASE_URL environment variable is not set');
    }
    
    const client = createClient({
      url,
      authToken,
    });
    
    // Fetch user details
    const allUsersResult = await client.execute({
      sql: 'SELECT id, username, email FROM user',
    });
    
    // Fetch user settings for inspiration quotes
    const userIdsArray = Array.from(userIds);
    let settingsMap = new Map<string, string | null>();
    
    if (userIdsArray.length > 0) {
      const placeholders = userIdsArray.map(() => '?').join(',');
      const settingsResult = await client.execute({
        sql: `SELECT user_id, inspiration_quote FROM user_settings WHERE user_id IN (${placeholders})`,
        args: userIdsArray,
      });
      
      settingsMap = new Map(
        settingsResult.rows.map((row: any) => [
          row.user_id as string,
          row.inspiration_quote as string | null,
        ])
      );
    }
    
    const allUsers = allUsersResult.rows
      .filter((row: any) => userIds.has(row.id))
      .map((row: any) => ({
        id: row.id as string,
        username: row.username as string | null,
        email: row.email as string,
        inspirationQuote: settingsMap.get(row.id) || null,
      }));

    const userMap = new Map(
      allUsers.map(user => [
        user.id,
        {
          id: user.id,
          username: user.username,
          email: user.email,
          inspirationQuote: user.inspirationQuote,
        },
      ])
    );

    // Calculate streaks for all qualifying users
    const allLogsForStreaks = await db
      .select({
        userId: schema.workoutLogs.userId,
        date: schema.workoutLogs.date,
      })
      .from(schema.workoutLogs);

    const userWorkouts = new Map<string, string[]>();
    allLogsForStreaks.forEach(log => {
      if (userIds.has(log.userId)) {
        if (!userWorkouts.has(log.userId)) {
          userWorkouts.set(log.userId, []);
        }
        userWorkouts.get(log.userId)!.push(log.date);
      }
    });

    const streaksMap = new Map<string, { currentStreak: number; longestStreak: number }>();
    userWorkouts.forEach((dates, userId) => {
      const streakData = calculateStreaks(dates);
      streaksMap.set(userId, streakData);
    });

    // Build leaderboard entries
    const leaderboard: LeaderboardEntry[] = qualifyingUsers
      .map(({ userId, count }) => {
        const user = userMap.get(userId);
        if (!user) return null;
        
        const streakData = streaksMap.get(userId) || { currentStreak: 0, longestStreak: 0 };
        
        return {
          userId,
          username: user.username,
          email: user.email,
          inspirationQuote: user.inspirationQuote,
          workoutCount: count,
          currentStreak: streakData.currentStreak,
          longestStreak: streakData.longestStreak,
          rank: 0,
        };
      })
      .filter((entry): entry is LeaderboardEntry => entry !== null)
      .sort((a, b) => b.workoutCount - a.workoutCount);

    // Calculate ranks with proper tie handling
    let currentRank = 1;
    for (let i = 0; i < leaderboard.length; i++) {
      if (i === 0) {
        leaderboard[i].rank = 1;
      } else {
        if (leaderboard[i].workoutCount !== leaderboard[i - 1].workoutCount) {
          currentRank = i + 1;
        }
        leaderboard[i].rank = currentRank;
      }
    }

    return leaderboard;
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
}

