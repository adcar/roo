import { NextRequest, NextResponse } from 'next/server';
import { getDb, schema } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// GET: Fetch all in-progress workouts for the current user
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getDb();
    const progress = await db
      .select()
      .from(schema.workoutProgress)
      .where(eq(schema.workoutProgress.userId, session.user.id));

    return NextResponse.json({
      progress: progress.map(p => ({
        id: p.id,
        programId: p.programId,
        dayId: p.dayId,
        week: p.week,
        currentExerciseIndex: p.currentExerciseIndex,
        updatedAt: p.updatedAt,
      }))
    });
  } catch (error) {
    console.error('Error fetching workout progress:', error);
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
  }
}

