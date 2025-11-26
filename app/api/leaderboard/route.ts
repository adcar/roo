import { NextResponse } from 'next/server';
import { getDb, schema } from '@/lib/db';
import { createClient } from '@libsql/client';
import { and, gte, lte } from 'drizzle-orm';

interface LeaderboardEntry {
  userId: string;
  username: string | null;
  email: string;
  inspirationQuote: string | null;
  workoutCount: number;
}

export async function GET(request: Request) {
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

    // Filter workouts with 4+ exercises and count per user
    const userWorkoutCounts = new Map<string, number>();
    
    for (const log of logs) {
      try {
        const exercises = JSON.parse(log.exercises);
        // A workout qualifies if it has 4 or more exercises
        if (Array.isArray(exercises) && exercises.length >= 4) {
          const currentCount = userWorkoutCounts.get(log.userId) || 0;
          userWorkoutCounts.set(log.userId, currentCount + 1);
        }
      } catch (e) {
        // Skip invalid JSON
        console.error('Error parsing exercises:', e);
      }
    }

    // Filter users with at least 1 qualifying workout (qualification threshold)
    const qualifyingUsers = Array.from(userWorkoutCounts.entries())
      .filter(([_, count]) => count >= 1)
      .map(([userId, count]) => ({ userId, count }));

    if (qualifyingUsers.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch user details for qualifying users
    // Create a client connection to query the user table (auth schema)
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

    // Create map of user details for qualifying users only
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

    // Build leaderboard entries
    const leaderboard: LeaderboardEntry[] = qualifyingUsers
      .map(({ userId, count }) => {
        const user = userMap.get(userId);
        if (!user) return null;
        
        return {
          userId,
          username: user.username,
          email: user.email,
          inspirationQuote: user.inspirationQuote,
          workoutCount: count,
        };
      })
      .filter((entry): entry is LeaderboardEntry => entry !== null)
      .sort((a, b) => b.workoutCount - a.workoutCount); // Sort by workout count descending

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}

