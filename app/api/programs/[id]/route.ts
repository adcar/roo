import { NextResponse } from 'next/server';
import { getDb, schema } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { getUserId } from '@/lib/auth-server';

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
    const userId = await getUserId();
    const { id } = await params;
    const db = await getDb();
    const [program] = await db
      .select()
      .from(schema.programs)
      .where(and(
        eq(schema.programs.id, id),
        eq(schema.programs.userId, userId)
      ) as any);

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    const days = JSON.parse(program.days);
    return NextResponse.json({
      ...program,
      days: normalizeExerciseOrder(days),
      isSplit: program.isSplit !== null ? Boolean(program.isSplit) : undefined, // Convert integer to boolean, undefined if null
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching program:', error);
    return NextResponse.json({ error: 'Failed to fetch program' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    const { id } = await params;
    const body = await request.json();
    const db = await getDb();

    // Verify the program belongs to the user
    const [existingProgram] = await db
      .select()
      .from(schema.programs)
      .where(and(
        eq(schema.programs.id, id),
        eq(schema.programs.userId, userId)
      ) as any);

    if (!existingProgram) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    const program = {
      name: body.name,
      days: JSON.stringify(body.days),
      isSplit: body.isSplit !== undefined ? (body.isSplit ? 1 : 0) : null,
      updatedAt: new Date().toISOString(),
    };

    await db
      .update(schema.programs)
      .set(program)
      .where(and(
        eq(schema.programs.id, id),
        eq(schema.programs.userId, userId)
      ) as any);

    return NextResponse.json({
      id,
      ...program,
      days: JSON.parse(program.days),
      isSplit: program.isSplit !== null ? Boolean(program.isSplit) : undefined,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error updating program:', error);
    return NextResponse.json({ error: 'Failed to update program' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    const { id } = await params;
    const db = await getDb();
    
    // Verify the program belongs to the user before deleting
    await db
      .delete(schema.programs)
      .where(and(
        eq(schema.programs.id, id),
        eq(schema.programs.userId, userId)
      ) as any);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error deleting program:', error);
    return NextResponse.json({ error: 'Failed to delete program' }, { status: 500 });
  }
}
