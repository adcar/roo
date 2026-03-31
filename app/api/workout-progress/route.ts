import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-server';
import { getDb, schema } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const userId = await getUserId();
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const programId = searchParams.get('programId');
    const dayId = searchParams.get('dayId');
    const week = searchParams.get('week');

    if (!programId || !dayId || !week) {
      return NextResponse.json({ error: 'Missing programId, dayId, or week' }, { status: 400 });
    }

    const rows = await db
      .select()
      .from(schema.workoutProgress)
      .where(
        and(
          eq(schema.workoutProgress.programId, programId),
          eq(schema.workoutProgress.dayId, dayId),
          eq(schema.workoutProgress.week, week),
          eq(schema.workoutProgress.userId, userId),
        ),
      );

    if (!rows.length) return NextResponse.json(null);

    const row = rows[0];
    return NextResponse.json({ ...row, exercises: JSON.parse(row.exercises) });
  } catch (e: any) {
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    const db = getDb();
    const body = await request.json();
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    await db.insert(schema.workoutProgress).values({
      id,
      programId: body.programId,
      dayId: body.dayId,
      week: body.week,
      currentExerciseIndex: body.currentExerciseIndex ?? 0,
      exercises: JSON.stringify(body.exercises),
      userId,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (e: any) {
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getUserId();
    const db = getDb();
    const body = await request.json();

    if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const now = new Date().toISOString();
    const updates: Record<string, any> = { updatedAt: now };
    if (body.currentExerciseIndex !== undefined) updates.currentExerciseIndex = body.currentExerciseIndex;
    if (body.exercises !== undefined) updates.exercises = JSON.stringify(body.exercises);

    await db
      .update(schema.workoutProgress)
      .set(updates)
      .where(and(eq(schema.workoutProgress.id, body.id), eq(schema.workoutProgress.userId, userId)));

    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
