import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-server';
import { getDb, schema } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    const { id } = await params;
    const db = getDb();

    const rows = await db
      .select()
      .from(schema.customExercises)
      .where(and(eq(schema.customExercises.id, id), eq(schema.customExercises.userId, userId)));

    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const r = rows[0];
    return NextResponse.json({
      ...r,
      primaryMuscles: JSON.parse(r.primaryMuscles),
      secondaryMuscles: JSON.parse(r.secondaryMuscles),
      images: JSON.parse(r.images),
    });
  } catch (e: any) {
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    const { id } = await params;
    const db = getDb();
    const body = await request.json();

    const updates: Record<string, any> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.primaryMuscles !== undefined) updates.primaryMuscles = JSON.stringify(body.primaryMuscles);
    if (body.secondaryMuscles !== undefined) updates.secondaryMuscles = JSON.stringify(body.secondaryMuscles);
    if (body.level !== undefined) updates.level = body.level;
    if (body.category !== undefined) updates.category = body.category;
    if (body.equipment !== undefined) updates.equipment = body.equipment;
    if (body.instructions !== undefined) updates.instructions = body.instructions;
    if (body.images !== undefined) updates.images = JSON.stringify(body.images);

    await db
      .update(schema.customExercises)
      .set(updates)
      .where(and(eq(schema.customExercises.id, id), eq(schema.customExercises.userId, userId)));

    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    const { id } = await params;
    const db = getDb();

    await db
      .delete(schema.customExercises)
      .where(and(eq(schema.customExercises.id, id), eq(schema.customExercises.userId, userId)));

    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
