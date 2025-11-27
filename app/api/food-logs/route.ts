import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { getUserId } from '@/lib/auth-server';

/**
 * GET /api/food-logs?date=YYYY-MM-DD - Get food log entry for a specific date
 * GET /api/food-logs - Get all food log entries for the user
 */
export async function GET(request: Request) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const db = await getDb();

    if (date) {
      // Get specific date entry
      const [logEntry] = await db
        .select()
        .from(schema.foodLogEntries)
        .where(and(
          eq(schema.foodLogEntries.userId, userId),
          eq(schema.foodLogEntries.date, date)
        ) as any);

      if (!logEntry) {
        return NextResponse.json({ entry: null, items: [] });
      }

      // Get items for this entry
      const items = await db
        .select()
        .from(schema.foodLogItems)
        .where(eq(schema.foodLogItems.logEntryId, logEntry.id));

      // Get product data for each item
      const itemsWithProducts = await Promise.all(
        items.map(async (item) => {
          const [product] = await db
            .select()
            .from(schema.products)
            .where(eq(schema.products.id, item.productId));

          return {
            ...item,
            product: product ? JSON.parse(product.productData) : null,
          };
        })
      );

      return NextResponse.json({
        entry: logEntry,
        items: itemsWithProducts,
      });
    } else {
      // Get all entries
      const entries = await db
        .select()
        .from(schema.foodLogEntries)
        .where(eq(schema.foodLogEntries.userId, userId))
        .orderBy(schema.foodLogEntries.date);

      return NextResponse.json(entries);
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching food logs:', error);
    return NextResponse.json({ error: 'Failed to fetch food logs' }, { status: 500 });
  }
}

/**
 * POST /api/food-logs - Create or update a food log entry
 * Body: { date: "YYYY-MM-DD", items: [{ productId, quantity, mealType }] }
 */
export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    const { date, items } = body;

    if (!date || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Date and items array are required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const now = new Date().toISOString();

    // Check if entry already exists
    const [existingEntry] = await db
      .select()
      .from(schema.foodLogEntries)
      .where(and(
        eq(schema.foodLogEntries.userId, userId),
        eq(schema.foodLogEntries.date, date)
      ) as any);

    let logEntryId: string;

    if (existingEntry) {
      logEntryId = existingEntry.id;
      // Update entry
      await db
        .update(schema.foodLogEntries)
        .set({ updatedAt: now })
        .where(eq(schema.foodLogEntries.id, logEntryId));

      // Delete existing items
      await db
        .delete(schema.foodLogItems)
        .where(eq(schema.foodLogItems.logEntryId, logEntryId));
    } else {
      // Create new entry
      logEntryId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.insert(schema.foodLogEntries).values({
        id: logEntryId,
        date,
        userId,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Insert new items
    if (items.length > 0) {
      const logItems = items.map((item: any) => ({
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        logEntryId,
        productId: item.productId,
        quantity: item.quantity,
        mealType: item.mealType || null,
        createdAt: now,
      }));

      await db.insert(schema.foodLogItems).values(logItems);

      // Add products to user_foods table (if not already there)
      // Get unique product IDs
      const uniqueProductIds = Array.from(new Set(items.map((item: any) => item.productId)));
      
      // Check which products are already in user_foods for this user
      const existingUserFoods = await db
        .select()
        .from(schema.userFoods)
        .where(eq(schema.userFoods.userId, userId));
      
      const existingProductIds = new Set(existingUserFoods.map(uf => uf.productId));
      
      // Insert only new products
      const newProductIds = uniqueProductIds.filter(id => !existingProductIds.has(id));
      if (newProductIds.length > 0) {
        await db.insert(schema.userFoods).values(
          newProductIds.map(productId => ({
            userId,
            productId,
            createdAt: now,
          }))
        );
      }
    }

    // Fetch and return the complete entry with items
    const [logEntry] = await db
      .select()
      .from(schema.foodLogEntries)
      .where(eq(schema.foodLogEntries.id, logEntryId));

    const logItems = await db
      .select()
      .from(schema.foodLogItems)
      .where(eq(schema.foodLogItems.logEntryId, logEntryId));

    const itemsWithProducts = await Promise.all(
      logItems.map(async (item) => {
        const [product] = await db
          .select()
          .from(schema.products)
          .where(eq(schema.products.id, item.productId));

        return {
          ...item,
          product: product ? JSON.parse(product.productData) : null,
        };
      })
    );

    return NextResponse.json({
      entry: logEntry,
      items: itemsWithProducts,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error creating food log:', error);
    return NextResponse.json({ error: 'Failed to create food log' }, { status: 500 });
  }
}

/**
 * DELETE /api/food-logs?date=YYYY-MM-DD - Delete a food log entry
 */
export async function DELETE(request: Request) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
    }

    const db = await getDb();

    // Find the entry
    const [logEntry] = await db
      .select()
      .from(schema.foodLogEntries)
      .where(and(
        eq(schema.foodLogEntries.userId, userId),
        eq(schema.foodLogEntries.date, date)
      ) as any);

    if (!logEntry) {
      return NextResponse.json({ error: 'Log entry not found' }, { status: 404 });
    }

    // Delete items first
    await db
      .delete(schema.foodLogItems)
      .where(eq(schema.foodLogItems.logEntryId, logEntry.id));

    // Delete entry
    await db
      .delete(schema.foodLogEntries)
      .where(eq(schema.foodLogEntries.id, logEntry.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error deleting food log:', error);
    return NextResponse.json({ error: 'Failed to delete food log' }, { status: 500 });
  }
}

