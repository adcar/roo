import { NextRequest, NextResponse } from 'next/server';
import { getDb, schema } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// GET: Check if there's any in-progress workout for a program
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getDb();
    const { id } = await params;
    const programId = id;

    const progress = await db
      .select()
      .from(schema.workoutProgress)
      .where(
        eq(schema.workoutProgress.userId, session.user.id)
      );

    // Filter for this program
    const programProgress = progress.filter(p => p.programId === programId);

    if (programProgress.length === 0) {
      return NextResponse.json({ hasProgress: false, progress: [] });
    }

    return NextResponse.json({
      hasProgress: true,
      progress: programProgress.map(p => ({
        id: p.id,
        dayId: p.dayId,
        week: p.week,
        currentExerciseIndex: p.currentExerciseIndex,
        updatedAt: p.updatedAt,
      }))
    });
  } catch (error) {
    console.error('Error checking workout progress:', error);
    return NextResponse.json({ error: 'Failed to check progress' }, { status: 500 });
  }
}

