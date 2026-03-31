import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-server';
import { getDb, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const userId = await getUserId();
    const db = getDb();

    const rows = await db
      .select({ date: schema.workoutLogs.date })
      .from(schema.workoutLogs)
      .where(eq(schema.workoutLogs.userId, userId));

    const uniqueDates = [...new Set(rows.map((r) => r.date.split('T')[0]))].sort();

    if (!uniqueDates.length) {
      return NextResponse.json({ currentStreak: 0, longestStreak: 0, totalWorkouts: 0 });
    }

    let currentStreak = 1;
    let longestStreak = 1;
    let tempStreak = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
      const prev = new Date(uniqueDates[i - 1]);
      const curr = new Date(uniqueDates[i]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    // Check if current streak is active (last workout today or yesterday)
    const lastDate = new Date(uniqueDates[uniqueDates.length - 1]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    lastDate.setHours(0, 0, 0, 0);
    const daysSinceLast = Math.round((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceLast <= 1) {
      currentStreak = tempStreak;
    } else {
      currentStreak = 0;
    }

    return NextResponse.json({
      currentStreak,
      longestStreak,
      totalWorkouts: rows.length,
    });
  } catch (e: any) {
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
