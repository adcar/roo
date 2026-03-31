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
      .from(schema.userSettings)
      .where(eq(schema.userSettings.userId, userId));

    if (!rows.length) return NextResponse.json(null);

    const r = rows[0];
    return NextResponse.json({
      ...r,
      availableEquipment: r.availableEquipment ? JSON.parse(r.availableEquipment) : [],
    });
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

    const values: Record<string, any> = { updatedAt: now };
    if (body.weekMapping !== undefined) values.weekMapping = body.weekMapping;
    if (body.inspirationQuote !== undefined) values.inspirationQuote = body.inspirationQuote;
    if (body.availableEquipment !== undefined) values.availableEquipment = JSON.stringify(body.availableEquipment);
    if (body.weight !== undefined) values.weight = body.weight;
    if (body.height !== undefined) values.height = body.height;
    if (body.bodyfatPercentage !== undefined) values.bodyfatPercentage = body.bodyfatPercentage;
    if (body.gender !== undefined) values.gender = body.gender;
    if (body.age !== undefined) values.age = body.age;

    const existing = await db
      .select()
      .from(schema.userSettings)
      .where(eq(schema.userSettings.userId, userId));

    if (existing.length) {
      await db
        .update(schema.userSettings)
        .set(values)
        .where(eq(schema.userSettings.userId, userId));
    } else {
      await db.insert(schema.userSettings).values({
        userId,
        weekMapping: body.weekMapping ?? 'oddA',
        updatedAt: now,
        ...values,
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
