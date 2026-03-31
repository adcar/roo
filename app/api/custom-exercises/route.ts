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
      .from(schema.customExercises)
      .where(eq(schema.customExercises.userId, userId));

    const exercises = rows.map((r) => ({
      ...r,
      primaryMuscles: JSON.parse(r.primaryMuscles),
      secondaryMuscles: JSON.parse(r.secondaryMuscles),
      images: JSON.parse(r.images),
    }));

    return NextResponse.json(exercises);
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

    await db.insert(schema.customExercises).values({
      id,
      name: body.name,
      description: body.description ?? null,
      primaryMuscles: JSON.stringify(body.primaryMuscles ?? []),
      secondaryMuscles: JSON.stringify(body.secondaryMuscles ?? []),
      level: body.level ?? null,
      category: body.category ?? null,
      equipment: body.equipment ?? null,
      instructions: body.instructions ?? null,
      images: JSON.stringify(body.images ?? []),
      isCustom: 1,
      userId,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (e: any) {
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
