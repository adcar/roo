import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-server';
import { getDb, schema } from '@/lib/db';

export async function GET() {
  try {
    await getUserId();
    const db = getDb();

    const rows = await db.select().from(schema.workoutLogs);

    const userStats: Record<string, { totalWorkouts: number; totalSets: number; totalVolume: number }> = {};

    for (const row of rows) {
      if (!userStats[row.userId]) {
        userStats[row.userId] = { totalWorkouts: 0, totalSets: 0, totalVolume: 0 };
      }
      userStats[row.userId].totalWorkouts++;

      const exercises = JSON.parse(row.exercises);
      for (const ex of exercises) {
        const sets = ex.sets ?? [];
        userStats[row.userId].totalSets += sets.length;
        for (const set of sets) {
          const weight = parseFloat(set.weight) || 0;
          const reps = parseInt(set.reps) || 0;
          userStats[row.userId].totalVolume += weight * reps;
        }
      }
    }

    const leaderboard = Object.entries(userStats)
      .map(([userId, stats]) => ({ userId, ...stats }))
      .sort((a, b) => b.totalVolume - a.totalVolume);

    return NextResponse.json(leaderboard);
  } catch (e: any) {
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
