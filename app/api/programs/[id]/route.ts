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
      .from(schema.programs)
      .where(and(eq(schema.programs.id, id), eq(schema.programs.userId, userId)));

    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const p = rows[0];
    const days = JSON.parse(p.days);
    const normalizedDays = days.map((day: any) => ({
      ...day,
      exercises: (day.exercises ?? []).map((ex: any, i: number) => ({
        ...ex,
        order: ex.order ?? i,
      })),
    }));

    return NextResponse.json({
      ...p,
      days: normalizedDays,
      isSplit: p.isSplit !== null ? Boolean(p.isSplit) : undefined,
      durationWeeks: p.durationWeeks ?? undefined,
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
    const now = new Date().toISOString();

    const updates: Record<string, any> = { updatedAt: now };
    if (body.name !== undefined) updates.name = body.name;
    if (body.days !== undefined) updates.days = JSON.stringify(body.days);
    if (body.isSplit !== undefined) updates.isSplit = body.isSplit ? 1 : 0;
    if (body.durationWeeks !== undefined) updates.durationWeeks = body.durationWeeks;

    await db
      .update(schema.programs)
      .set(updates)
      .where(and(eq(schema.programs.id, id), eq(schema.programs.userId, userId)));

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
      .delete(schema.programs)
      .where(and(eq(schema.programs.id, id), eq(schema.programs.userId, userId)));

    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
