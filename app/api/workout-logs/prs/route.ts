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
      .from(schema.workoutLogs)
      .where(eq(schema.workoutLogs.userId, userId));

    const prs: Record<string, { maxWeight: number; maxReps: number; maxWeightDate: string; maxRepsDate: string }> = {};

    for (const row of rows) {
      const exercises = JSON.parse(row.exercises);
      for (const ex of exercises) {
        const exId = ex.exerciseId ?? ex.id ?? ex.name;
        if (!exId) continue;

        if (!prs[exId]) {
          prs[exId] = { maxWeight: 0, maxReps: 0, maxWeightDate: '', maxRepsDate: '' };
        }

        const sets = ex.sets ?? [];
        for (const set of sets) {
          const weight = parseFloat(set.weight) || 0;
          const reps = parseInt(set.reps) || 0;

          if (weight > prs[exId].maxWeight) {
            prs[exId].maxWeight = weight;
            prs[exId].maxWeightDate = row.date;
          }
          if (reps > prs[exId].maxReps) {
            prs[exId].maxReps = reps;
            prs[exId].maxRepsDate = row.date;
          }
        }
      }
    }

    return NextResponse.json(prs);
  } catch (e: any) {
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
