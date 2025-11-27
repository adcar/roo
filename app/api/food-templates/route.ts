import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { getUserId } from '@/lib/auth-server';

/**
 * GET /api/food-templates - Get all food templates for the user
 */
export async function GET() {
  try {
    const userId = await getUserId();
    const db = await getDb();
    
    const templates = await db
      .select()
      .from(schema.foodTemplates)
      .where(eq(schema.foodTemplates.userId, userId));
    
    return NextResponse.json(templates.map(t => ({
      ...t,
      items: JSON.parse(t.items),
    })));
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching food templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

/**
 * POST /api/food-templates - Create a new food template
 */
export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    const { name, items } = body;

    if (!name || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Name and items array are required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const template = {
      id: templateId,
      name,
      items: JSON.stringify(items),
      userId,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(schema.foodTemplates).values(template);

    return NextResponse.json({
      ...template,
      items: JSON.parse(template.items),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error creating food template:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}

