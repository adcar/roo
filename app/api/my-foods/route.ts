import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getUserId } from '@/lib/auth-server';

/**
 * GET /api/my-foods - Get all foods the user has saved to their "My Foods" list
 */
export async function GET() {
  try {
    const userId = await getUserId();
    const db = await getDb();

    // Get all foods from user_foods table
    const userFoodsList = await db
      .select()
      .from(schema.userFoods)
      .where(eq(schema.userFoods.userId, userId));

    // Get product data for each food
    const products = await Promise.all(
      userFoodsList.map(async (userFood) => {
        const [product] = await db
          .select()
          .from(schema.products)
          .where(eq(schema.products.id, userFood.productId))
          .limit(1);

        if (!product) return null;

        const productData = JSON.parse(product.productData);
        const productInfo = productData.product || productData;

        // Get last used date from food log items
        const lastItems = await db
          .select({
            createdAt: schema.foodLogItems.createdAt,
          })
          .from(schema.foodLogItems)
          .innerJoin(
            schema.foodLogEntries,
            eq(schema.foodLogItems.logEntryId, schema.foodLogEntries.id)
          )
          .where(and(
            eq(schema.foodLogEntries.userId, userId),
            eq(schema.foodLogItems.productId, userFood.productId)
          ) as any)
          .orderBy(desc(schema.foodLogItems.createdAt))
          .limit(1);
        
        const lastItem = lastItems[0];

        return {
          productId: userFood.productId,
          productName: productInfo.product_name || productInfo.product_name_en || 'Unknown Product',
          product: productData,
          lastUsed: lastItem?.createdAt ? new Date(lastItem.createdAt).toLocaleDateString() : undefined,
        };
      })
    );

    // Filter out nulls and sort by last used (most recent first)
    const validProducts = products.filter(p => p !== null) as Array<NonNullable<typeof products[0]>>;
    validProducts.sort((a, b) => {
      if (!a.lastUsed && !b.lastUsed) return 0;
      if (!a.lastUsed) return 1;
      if (!b.lastUsed) return -1;
      return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
    });

    return NextResponse.json(validProducts);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching my foods:', error);
    return NextResponse.json({ error: 'Failed to fetch foods' }, { status: 500 });
  }
}

