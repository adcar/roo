import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-server';
import { getDb, schema } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    const { id } = await params;
    const db = getDb();

    const program = await db
      .select()
      .from(schema.programs)
      .where(and(eq(schema.programs.id, id), eq(schema.programs.userId, userId)));

    if (!program.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const days = JSON.parse(program[0].days);
    const durationWeeks = program[0].durationWeeks ?? 1;
    const totalWorkouts = days.length * durationWeeks;

    const logs = await db
      .select()
      .from(schema.workoutLogs)
      .where(and(eq(schema.workoutLogs.programId, id), eq(schema.workoutLogs.userId, userId)));

    const completedWorkouts = logs.length;

    return NextResponse.json({
      programId: id,
      totalWorkouts,
      completedWorkouts,
      percentage: totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0,
    });
  } catch (e: any) {
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
