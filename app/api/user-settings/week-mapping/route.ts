import { NextResponse } from 'next/server';
import { getDb, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { getUserId } from '@/lib/auth-server';

export async function GET() {
  try {
    const userId = await getUserId();
    const db = await getDb();
    
    const settings = await db
      .select()
      .from(schema.userSettings)
      .where(eq(schema.userSettings.userId, userId))
      .limit(1);

    // If no settings exist, return default
    if (settings.length === 0) {
      return NextResponse.json({ weekMapping: 'oddA' });
    }

    return NextResponse.json({ weekMapping: settings[0].weekMapping });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching week mapping:', error);
    return NextResponse.json({ error: 'Failed to fetch week mapping' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getUserId();
    const { weekMapping } = await request.json();

    if (weekMapping !== 'oddA' && weekMapping !== 'oddB') {
      return NextResponse.json({ error: 'Invalid week mapping value' }, { status: 400 });
    }

    const db = await getDb();
    const now = new Date().toISOString();

    // Try to update existing settings
    const existing = await db
      .select()
      .from(schema.userSettings)
      .where(eq(schema.userSettings.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(schema.userSettings)
        .set({
          weekMapping,
          updatedAt: now,
        })
        .where(eq(schema.userSettings.userId, userId));
    } else {
      // Insert new settings
      await db.insert(schema.userSettings).values({
        userId,
        weekMapping,
        updatedAt: now,
      });
    }

    return NextResponse.json({ weekMapping });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error updating week mapping:', error);
    return NextResponse.json({ error: 'Failed to update week mapping' }, { status: 500 });
  }
}

