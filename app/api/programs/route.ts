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
      .from(schema.programs)
      .where(eq(schema.programs.userId, userId));

    const programs = rows.map((p) => {
      const days = JSON.parse(p.days);
      const normalizedDays = days.map((day: any) => ({
        ...day,
        exercises: (day.exercises ?? []).map((ex: any, i: number) => ({
          ...ex,
          order: ex.order ?? i,
        })),
      }));
      return {
        ...p,
        days: normalizedDays,
        isSplit: p.isSplit !== null ? Boolean(p.isSplit) : undefined,
        durationWeeks: p.durationWeeks ?? undefined,
      };
    });

    return NextResponse.json(programs);
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
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    await db.insert(schema.programs).values({
      id,
      name: body.name,
      days: JSON.stringify(body.days),
      isSplit: body.isSplit ? 1 : 0,
      durationWeeks: body.durationWeeks ?? null,
      createdAt: now,
      updatedAt: now,
      userId,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (e: any) {
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
