import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-server';
import { getDb, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const userId = await getUserId();
    const db = getDb();

    const rows = await db
      .select({ weekMapping: schema.userSettings.weekMapping })
      .from(schema.userSettings)
      .where(eq(schema.userSettings.userId, userId));

    if (!rows.length) return NextResponse.json({ weekMapping: 'oddA' });
    return NextResponse.json({ weekMapping: rows[0].weekMapping });
  } catch (e: any) {
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getUserId();
    const db = getDb();
    const body = await request.json();
    const now = new Date().toISOString();

    if (!body.weekMapping) return NextResponse.json({ error: 'Missing weekMapping' }, { status: 400 });

    const existing = await db
      .select()
      .from(schema.userSettings)
      .where(eq(schema.userSettings.userId, userId));

    if (existing.length) {
      await db
        .update(schema.userSettings)
        .set({ weekMapping: body.weekMapping, updatedAt: now })
        .where(eq(schema.userSettings.userId, userId));
    } else {
      await db.insert(schema.userSettings).values({
        userId,
        weekMapping: body.weekMapping,
        updatedAt: now,
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
