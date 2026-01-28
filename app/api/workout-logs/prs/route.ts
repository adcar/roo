import { NextResponse } from 'next/server';
import { getDb, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { getUserId } from '@/lib/auth-server';
import { ExerciseLog, SetLog } from '@/types/exercise';

interface PR {
  exerciseId: string;
  maxWeight: number;
  maxReps: number; // Reps achieved at max weight
  date: string;
}

export async function GET() {
  try {
    const userId = await getUserId();
    const db = await getDb();

    // Fetch all workout logs for this user
    const logs = await db
      .select()
      .from(schema.workoutLogs)
      .where(eq(schema.workoutLogs.userId, userId));

    // Calculate PRs from all logs
    const prs = new Map<string, PR>();

    for (const log of logs) {
      const exercises: ExerciseLog[] = JSON.parse(log.exercises);
      
      for (const exerciseLog of exercises) {
        for (const set of exerciseLog.sets) {
          // Only count completed sets with weight
          if (set.completed && set.weight !== undefined && set.weight > 0) {
            const currentPR = prs.get(exerciseLog.exerciseId);
            
            if (!currentPR || set.weight > currentPR.maxWeight) {
              prs.set(exerciseLog.exerciseId, {
                exerciseId: exerciseLog.exerciseId,
                maxWeight: set.weight,
                maxReps: set.reps || 0,
                date: log.date,
              });
            }
          }
        }
      }
    }

    return NextResponse.json(Object.fromEntries(prs));
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching PRs:', error);
    return NextResponse.json({ error: 'Failed to fetch PRs' }, { status: 500 });
  }
}

