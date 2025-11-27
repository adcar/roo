import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { getProductByBarcode, searchProducts } from '@/lib/openfoodfacts-api';

/**
 * GET /api/products?barcode=xxx - Get product by barcode (from API or DB)
 * GET /api/products?search=xxx&page=1 - Search products
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const barcode = searchParams.get('barcode');
    const searchQuery = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);

    const db = await getDb();

    // Get by barcode
    if (barcode) {
      // First check database (with error handling in case table doesn't exist yet)
      let cachedProduct = null;
      try {
        [cachedProduct] = await db
          .select()
          .from(schema.products)
          .where(eq(schema.products.id, barcode));
      } catch (error) {
        // Table might not exist yet, continue to fetch from API
        console.log('Products table not found, will create it');
      }

      if (cachedProduct) {
        return NextResponse.json({
          ...JSON.parse(cachedProduct.productData),
          cached: true,
        });
      }

      // Not in database, fetch from API
      const productData = await getProductByBarcode(barcode);
      
      if (!productData || productData.status === 0) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      // Store in database for future use
      const now = new Date().toISOString();
      try {
        // Check if product already exists
        const [existing] = await db
          .select()
          .from(schema.products)
          .where(eq(schema.products.id, barcode))
          .limit(1);

        if (existing) {
          // Update existing product
          await db
            .update(schema.products)
            .set({
              productData: JSON.stringify(productData),
              updatedAt: now,
            })
            .where(eq(schema.products.id, barcode));
        } else {
          // Insert new product
          await db.insert(schema.products).values({
            id: barcode,
            productData: JSON.stringify(productData),
            createdAt: now,
            updatedAt: now,
          });
        }
      } catch (error) {
        // Ignore insert errors, just return the product
        console.error('Error storing product:', error);
      }

      return NextResponse.json({
        ...productData,
        cached: false,
      });
    }

    // Search products
    if (searchQuery) {
      const searchResult = await searchProducts(searchQuery, page);
      return NextResponse.json(searchResult);
    }

    return NextResponse.json({ error: 'Missing barcode or search parameter' }, { status: 400 });
  } catch (error) {
    console.error('Error in products API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

