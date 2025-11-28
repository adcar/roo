import { NextRequest, NextResponse } from 'next/server';
import { getDb, schema } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// GET: Fetch workout progress (by programId, dayId, week)
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const programId = searchParams.get('programId');
  const dayId = searchParams.get('dayId');
  const week = searchParams.get('week');

  if (!programId || !dayId || !week) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const progress = await db
      .select()
      .from(schema.workoutProgress)
      .where(
        and(
          eq(schema.workoutProgress.userId, session.user.id),
          eq(schema.workoutProgress.programId, programId),
          eq(schema.workoutProgress.dayId, dayId),
          eq(schema.workoutProgress.week, week)
        )
      );

    if (progress.length === 0) {
      return NextResponse.json({ progress: null });
    }

    const progressData = progress[0];
    return NextResponse.json({
      progress: {
        id: progressData.id,
        programId: progressData.programId,
        dayId: progressData.dayId,
        week: progressData.week,
        currentExerciseIndex: progressData.currentExerciseIndex,
        exercises: JSON.parse(progressData.exercises),
        createdAt: progressData.createdAt,
        updatedAt: progressData.updatedAt,
      }
    });
  } catch (error) {
    console.error('Error fetching workout progress:', error);
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
  }
}

// POST: Save workout progress
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { programId, dayId, week, currentExerciseIndex, exercises } = body;

    if (!programId || !dayId || !week || currentExerciseIndex === undefined || !exercises) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = await getDb();
    const now = new Date().toISOString();
    const userId = session.user.id;

    // Check if progress already exists
    const existingProgress = await db
      .select()
      .from(schema.workoutProgress)
      .where(
        and(
          eq(schema.workoutProgress.userId, userId),
          eq(schema.workoutProgress.programId, programId),
          eq(schema.workoutProgress.dayId, dayId),
          eq(schema.workoutProgress.week, week)
        )
      );

    if (existingProgress.length > 0) {
      // Update existing progress
      await db
        .update(schema.workoutProgress)
        .set({
          currentExerciseIndex,
          exercises: JSON.stringify(exercises),
          updatedAt: now,
        })
        .where(eq(schema.workoutProgress.id, existingProgress[0].id));

      return NextResponse.json({
        id: existingProgress[0].id,
        updatedAt: now,
      });
    } else {
      // Create new progress
      const id = `${userId}-${programId}-${dayId}-${week}`;
      await db.insert(schema.workoutProgress).values({
        id,
        programId,
        dayId,
        week,
        currentExerciseIndex,
        exercises: JSON.stringify(exercises),
        userId,
        createdAt: now,
        updatedAt: now,
      });

      return NextResponse.json({
        id,
        updatedAt: now,
      });
    }
  } catch (error) {
    console.error('Error saving workout progress:', error);
    return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
  }
}

// DELETE: Abandon workout progress
export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const programId = searchParams.get('programId');
  const dayId = searchParams.get('dayId');
  const week = searchParams.get('week');

  if (!programId || !dayId || !week) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  try {
    const db = await getDb();
    await db
      .delete(schema.workoutProgress)
      .where(
        and(
          eq(schema.workoutProgress.userId, session.user.id),
          eq(schema.workoutProgress.programId, programId),
          eq(schema.workoutProgress.dayId, dayId),
          eq(schema.workoutProgress.week, week)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting workout progress:', error);
    return NextResponse.json({ error: 'Failed to delete progress' }, { status: 500 });
  }
}

