import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { getUserId } from '@/lib/auth-server';

/**
 * GET /api/food-templates/[id] - Get a specific food template
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    const { id } = await params;
    const db = await getDb();

    const [template] = await db
      .select()
      .from(schema.foodTemplates)
      .where(and(
        eq(schema.foodTemplates.id, id),
        eq(schema.foodTemplates.userId, userId)
      ) as any);

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...template,
      items: JSON.parse(template.items),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching food template:', error);
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 });
  }
}

/**
 * PUT /api/food-templates/[id] - Update a food template
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    const { id } = await params;
    const body = await request.json();
    const { name, items } = body;

    const db = await getDb();

    // Verify the template belongs to the user
    const [existingTemplate] = await db
      .select()
      .from(schema.foodTemplates)
      .where(and(
        eq(schema.foodTemplates.id, id),
        eq(schema.foodTemplates.userId, userId)
      ) as any);

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const updates: Partial<typeof existingTemplate> = {
      updatedAt: new Date().toISOString(),
    };

    if (name !== undefined) {
      updates.name = name;
    }

    if (items !== undefined) {
      if (!Array.isArray(items)) {
        return NextResponse.json(
          { error: 'Items must be an array' },
          { status: 400 }
        );
      }
      updates.items = JSON.stringify(items);
    }

    await db
      .update(schema.foodTemplates)
      .set(updates)
      .where(eq(schema.foodTemplates.id, id));

    const [updatedTemplate] = await db
      .select()
      .from(schema.foodTemplates)
      .where(eq(schema.foodTemplates.id, id));

    return NextResponse.json({
      ...updatedTemplate,
      items: JSON.parse(updatedTemplate.items),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error updating food template:', error);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

/**
 * DELETE /api/food-templates/[id] - Delete a food template
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    const { id } = await params;
    const db = await getDb();

    // Verify the template belongs to the user
    const [existingTemplate] = await db
      .select()
      .from(schema.foodTemplates)
      .where(and(
        eq(schema.foodTemplates.id, id),
        eq(schema.foodTemplates.userId, userId)
      ) as any);

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    await db
      .delete(schema.foodTemplates)
      .where(eq(schema.foodTemplates.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error deleting food template:', error);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}

