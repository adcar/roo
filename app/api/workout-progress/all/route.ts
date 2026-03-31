import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-server';
import { getDb, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const userId = await getUserId();
    const db = getDb();

    const rows = await db
      .select()
      .from(schema.workoutProgress)
      .where(eq(schema.workoutProgress.userId, userId));

    const progress = rows.map((r) => ({ ...r, exercises: JSON.parse(r.exercises) }));
    return NextResponse.json(progress);
  } catch (e: any) {
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
