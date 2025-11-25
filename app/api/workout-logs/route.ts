import { NextResponse } from 'next/server';
import { getDb, schema } from '@/lib/db';
import { eq, and, like } from 'drizzle-orm';
import { getUserId } from '@/lib/auth-server';

export async function GET(request: Request) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(request.url);
    const programId = searchParams.get('programId');
    const dayId = searchParams.get('dayId');

    const db = await getDb();
    let conditions = [eq(schema.workoutLogs.userId, userId)];

    if (programId && dayId) {
      conditions.push(
        eq(schema.workoutLogs.programId, programId),
        eq(schema.workoutLogs.dayId, dayId)
      );
    } else if (programId) {
      conditions.push(eq(schema.workoutLogs.programId, programId));
    }

    const logs = await db
      .select()
      .from(schema.workoutLogs)
      .where(and(...conditions) as any);

    return NextResponse.json(
      logs.map(log => ({
        ...log,
        exercises: JSON.parse(log.exercises),
      }))
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching workout logs:', error);
    return NextResponse.json({ error: 'Failed to fetch workout logs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    const db = await getDb();

    const log = {
      id: body.id || Date.now().toString(),
      programId: body.programId,
      dayId: body.dayId,
      week: body.week,
      date: body.date || new Date().toISOString(),
      exercises: JSON.stringify(body.exercises),
      userId,
    };

    await db.insert(schema.workoutLogs).values(log);

    return NextResponse.json({
      ...log,
      exercises: JSON.parse(log.exercises),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error creating workout log:', error);
    return NextResponse.json({ error: 'Failed to create workout log' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(request.url);
    const logId = searchParams.get('id');
    const date = searchParams.get('date');

    if (!logId && !date) {
      return NextResponse.json({ error: 'Either id or date must be provided' }, { status: 400 });
    }

    const db = await getDb();

    if (logId) {
      // Delete specific log by ID (ensure it belongs to the user)
      await db
        .delete(schema.workoutLogs)
        .where(and(
          eq(schema.workoutLogs.id, logId),
          eq(schema.workoutLogs.userId, userId)
        ) as any);
    } else if (date) {
      // Delete all logs for a specific date (date is stored as ISO string, so we match the date part)
      const dateStr = new Date(date).toISOString().split('T')[0];
      await db
        .delete(schema.workoutLogs)
        .where(and(
          like(schema.workoutLogs.date, `${dateStr}%`),
          eq(schema.workoutLogs.userId, userId)
        ) as any);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error deleting workout log:', error);
    return NextResponse.json({ error: 'Failed to delete workout log' }, { status: 500 });
  }
}
