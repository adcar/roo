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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();
    const [program] = await db
      .select()
      .from(schema.programs)
      .where(eq(schema.programs.id, id));

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    const days = JSON.parse(program.days);
    return NextResponse.json({
      ...program,
      days: normalizeExerciseOrder(days),
    });
  } catch (error) {
    console.error('Error fetching program:', error);
    return NextResponse.json({ error: 'Failed to fetch program' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = await getDb();

    const program = {
      name: body.name,
      days: JSON.stringify(body.days),
      updatedAt: new Date().toISOString(),
    };

    await db
      .update(schema.programs)
      .set(program)
      .where(eq(schema.programs.id, id));

    return NextResponse.json({
      id,
      ...program,
      days: JSON.parse(program.days),
    });
  } catch (error) {
    console.error('Error updating program:', error);
    return NextResponse.json({ error: 'Failed to update program' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();
    await db.delete(schema.programs).where(eq(schema.programs.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting program:', error);
    return NextResponse.json({ error: 'Failed to delete program' }, { status: 500 });
  }
}
