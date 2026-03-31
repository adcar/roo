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
    const exerciseId = searchParams.get('exerciseId');

    const conditions = [eq(schema.workoutNotes.userId, userId)];
    if (programId) conditions.push(eq(schema.workoutNotes.programId, programId));
    if (dayId) conditions.push(eq(schema.workoutNotes.dayId, dayId));
    if (week) conditions.push(eq(schema.workoutNotes.week, week));
    if (exerciseId) conditions.push(eq(schema.workoutNotes.exerciseId, exerciseId));

    const rows = await db
      .select()
      .from(schema.workoutNotes)
      .where(and(...conditions));

    return NextResponse.json(rows);
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

    await db.insert(schema.workoutNotes).values({
      id,
      programId: body.programId,
      dayId: body.dayId,
      week: body.week,
      exerciseId: body.exerciseId,
      notes: body.notes ?? null,
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
