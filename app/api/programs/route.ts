import { NextResponse } from 'next/server';
import { getDb, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';

function normalizeExerciseOrder(days: any[]) {
  return days.map(day => ({
    ...day,
    weekA: day.weekA?.map((ex: any, idx: number) => ({ ...ex, order: ex.order ?? idx })) || [],
    weekB: day.weekB?.map((ex: any, idx: number) => ({ ...ex, order: ex.order ?? idx })) || [],
  }));
}

export async function GET() {
  try {
    const db = await getDb();
    const allPrograms = await db.select().from(schema.programs);

    const programs = allPrograms.map(p => {
      const days = JSON.parse(p.days);
      return {
        ...p,
        days: normalizeExerciseOrder(days),
      };
    });

    return NextResponse.json(programs);
  } catch (error) {
    console.error('Error fetching programs:', error);
    return NextResponse.json({ error: 'Failed to fetch programs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = await getDb();

    const program = {
      id: body.id || Date.now().toString(),
      name: body.name,
      days: JSON.stringify(body.days),
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.insert(schema.programs).values(program);

    return NextResponse.json({
      ...program,
      days: JSON.parse(program.days),
    });
  } catch (error) {
    console.error('Error creating program:', error);
    return NextResponse.json({ error: 'Failed to create program' }, { status: 500 });
  }
}
