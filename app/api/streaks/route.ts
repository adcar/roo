import { NextResponse } from 'next/server';
import { getDb, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';

interface StreakData {
  userId: string;
  currentStreak: number;
  longestStreak: number;
}

// Get ISO week number of the year (1-53)
// Uses local time to avoid timezone issues
function getISOWeekNumber(date: Date): number {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayNum = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - dayNum);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Get the Monday of the ISO week
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  return new Date(d.setDate(diff));
}

// Helper to get week key from date
function getWeekKey(date: Date): string {
  // Use local date to get the correct week
  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const year = localDate.getFullYear();
  const weekNum = getISOWeekNumber(localDate);
  return `${year}-W${weekNum.toString().padStart(2, '0')}`;
}

// Helper to get previous week key
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

// Calculate streaks for a user
function calculateStreaks(workoutDates: string[]): { currentStreak: number; longestStreak: number } {
  if (workoutDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Group workouts by ISO week
  const weekMap = new Map<string, number>();
  
  workoutDates.forEach(dateStr => {
    try {
      const date = new Date(dateStr);
      // Validate date is valid
      if (isNaN(date.getTime())) {
        console.error('Invalid date:', dateStr);
        return;
      }
      const weekKey = getWeekKey(date);
      weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + 1);
    } catch (e) {
      console.error('Error processing date:', dateStr, e);
    }
  });

  // Get all weeks with 2+ workouts, sorted chronologically
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

  // Calculate current streak (from most recent qualifying week backwards)
  const today = new Date();
  const currentWeekKey = getWeekKey(today);
  
  // Find the most recent completed qualifying week (exclude current week)
  const currentWeekCount = weekMap.get(currentWeekKey) || 0;
  let mostRecentQualifyingWeek: string | null = null;
  
  // Check previous weeks only (skip current week)
  let checkWeek = getPreviousWeekKey(currentWeekKey);
  for (let i = 0; i < 52; i++) {
    if (qualifyingWeeks.includes(checkWeek)) {
      mostRecentQualifyingWeek = checkWeek;
      break;
    }
    checkWeek = getPreviousWeekKey(checkWeek);
  }

  let currentStreak = 0;
  
  // Only count completed weeks (don't count current week)
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    const db = await getDb();
    
    // Fetch all workout logs for the user (or all users if userId not specified)
    let logs;
    if (userId) {
      logs = await db
        .select({
          userId: schema.workoutLogs.userId,
          date: schema.workoutLogs.date,
        })
        .from(schema.workoutLogs)
        .where(eq(schema.workoutLogs.userId, userId));
    } else {
      // Get all logs for all users
      logs = await db
        .select({
          userId: schema.workoutLogs.userId,
          date: schema.workoutLogs.date,
        })
        .from(schema.workoutLogs);
    }

    // Group by user
    const userWorkouts = new Map<string, string[]>();
    
    logs.forEach(log => {
      if (!userWorkouts.has(log.userId)) {
        userWorkouts.set(log.userId, []);
      }
      userWorkouts.get(log.userId)!.push(log.date);
    });

    // Calculate streaks for each user
    const streaks: StreakData[] = Array.from(userWorkouts.entries()).map(([userId, dates]) => {
      const streakData = calculateStreaks(dates);
      return {
        userId,
        ...streakData,
      };
    });

    if (userId) {
      // Return single user's streak
      const userStreak = streaks.find(s => s.userId === userId);
      const result = userStreak || { userId, currentStreak: 0, longestStreak: 0 };
      
      return NextResponse.json(result);
    }

    return NextResponse.json(streaks);
  } catch (error) {
    console.error('Error calculating streaks:', error);
    return NextResponse.json(
      { error: 'Failed to calculate streaks' },
      { status: 500 }
    );
  }
}

