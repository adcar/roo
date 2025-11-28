import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { getUserId } from '@/lib/auth-server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { getExerciseImagePath, getCustomExerciseImageDir } from '@/lib/file-utils';

// Mark this route as dynamic to avoid Turbopack static analysis warnings
export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    const { id } = await params;
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string || '';
    const primaryMuscles = JSON.parse(formData.get('primaryMuscles') as string || '[]');
    const secondaryMuscles = JSON.parse(formData.get('secondaryMuscles') as string || '[]');
    const level = formData.get('level') as string || 'beginner';
    const category = formData.get('category') as string || 'strength';
    const equipment = formData.get('equipment') as string || '';
    const instructions = formData.get('instructions') as string || '';

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const db = await getDb();

    // Verify the exercise belongs to the user
    const [existingExercise] = await db
      .select()
      .from(schema.customExercises)
      .where(and(
        eq(schema.customExercises.id, id),
        eq(schema.customExercises.userId, userId)
      ) as any);

    if (!existingExercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }

    // Get existing images
    const existingImages = JSON.parse(existingExercise.images || '[]');
    const imagePaths: string[] = [];

    // Handle image uploads
    for (let i = 0; i < 2; i++) {
      const imageFile = formData.get(`image${i}`) as File | null;
      if (imageFile) {
        const bytes = await imageFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        const imageDir = getCustomExerciseImageDir();
        if (!existsSync(imageDir)) {
          await mkdir(imageDir, { recursive: true });
        }
        
        // Delete old image if it exists
        if (existingImages[i]) {
          const oldImagePath = getExerciseImagePath(existingImages[i]);
          if (existsSync(oldImagePath)) {
            try {
              await unlink(oldImagePath);
            } catch (err) {
              console.error('Error deleting old image:', err);
            }
          }
        }
        
        const imageName = `${id}_${i}.jpg`;
        const imagePath = `${imageDir}/${imageName}`;
        await writeFile(imagePath, buffer);
        imagePaths.push(`custom/${imageName}`);
      } else if (existingImages[i]) {
        // Keep existing image if no new one provided
        imagePaths.push(existingImages[i]);
      }
    }

    const exercise = {
      name,
      description,
      primaryMuscles: JSON.stringify(primaryMuscles),
      secondaryMuscles: JSON.stringify(secondaryMuscles),
      level,
      category,
      equipment,
      instructions,
      images: JSON.stringify(imagePaths),
    };

    await db
      .update(schema.customExercises)
      .set(exercise)
      .where(and(
        eq(schema.customExercises.id, id),
        eq(schema.customExercises.userId, userId)
      ) as any);

    return NextResponse.json({
      id,
      ...exercise,
      primaryMuscles,
      secondaryMuscles,
      images: imagePaths,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error updating custom exercise:', error);
    return NextResponse.json({ error: 'Failed to update exercise' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    const { id } = await params;
    const db = await getDb();

    // Verify the exercise belongs to the user before deleting
    const [existingExercise] = await db
      .select()
      .from(schema.customExercises)
      .where(and(
        eq(schema.customExercises.id, id),
        eq(schema.customExercises.userId, userId)
      ) as any);

    if (!existingExercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }

    // Delete associated images
    const images = JSON.parse(existingExercise.images || '[]');
    for (const imagePath of images) {
      const fullPath = getExerciseImagePath(imagePath);
      if (existsSync(fullPath)) {
        try {
          await unlink(fullPath);
        } catch (err) {
          console.error('Error deleting image:', err);
        }
      }
    }

    await db
      .delete(schema.customExercises)
      .where(and(
        eq(schema.customExercises.id, id),
        eq(schema.customExercises.userId, userId)
      ) as any);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error deleting custom exercise:', error);
    return NextResponse.json({ error: 'Failed to delete exercise' }, { status: 500 });
  }
}

