import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-server';
import { getDb } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

/**
 * DELETE /api/my-foods/[id] - Remove a food from user's "My Foods" list
 * This removes it from the user_foods table, but doesn't affect food log entries
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    const { id } = await params;
    const db = await getDb();
    
    // Delete from user_foods table
    await db
      .delete(schema.userFoods)
      .where(and(
        eq(schema.userFoods.userId, userId),
        eq(schema.userFoods.productId, id)
      ) as any);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error deleting food:', error);
    return NextResponse.json({ error: 'Failed to delete food' }, { status: 500 });
  }
}

