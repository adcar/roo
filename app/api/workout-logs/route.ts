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

    const conditions = [eq(schema.workoutLogs.userId, userId)];
    if (programId) conditions.push(eq(schema.workoutLogs.programId, programId));
    if (dayId) conditions.push(eq(schema.workoutLogs.dayId, dayId));

    const rows = await db
      .select()
      .from(schema.workoutLogs)
      .where(and(...conditions));

    const logs = rows.map((r) => ({ ...r, exercises: JSON.parse(r.exercises) }));
    return NextResponse.json(logs);
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
    const id = crypto.randomUUID();

    await db.insert(schema.workoutLogs).values({
      id,
      programId: body.programId,
      dayId: body.dayId,
      week: body.week,
      date: body.date ?? new Date().toISOString(),
      exercises: JSON.stringify(body.exercises),
      userId,
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

    const updates: Record<string, any> = {};
    if (body.exercises !== undefined) updates.exercises = JSON.stringify(body.exercises);
    if (body.date !== undefined) updates.date = body.date;
    if (body.week !== undefined) updates.week = body.week;

    await db
      .update(schema.workoutLogs)
      .set(updates)
      .where(and(eq(schema.workoutLogs.id, body.id), eq(schema.workoutLogs.userId, userId)));

    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await getUserId();
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    await db
      .delete(schema.workoutLogs)
      .where(and(eq(schema.workoutLogs.id, id), eq(schema.workoutLogs.userId, userId)));

    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
