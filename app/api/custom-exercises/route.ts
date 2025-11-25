import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { getUserId } from '@/lib/auth-server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
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
    const exerciseId = `custom_${Date.now()}`;
    const imagePaths: string[] = [];

    // Handle image uploads
    for (let i = 0; i < 2; i++) {
      const imageFile = formData.get(`image${i}`) as File | null;
      if (imageFile) {
        const bytes = await imageFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        const imageDir = join(process.cwd(), 'public', 'exercise-images', 'custom');
        if (!existsSync(imageDir)) {
          await mkdir(imageDir, { recursive: true });
        }
        
        const imageName = `${exerciseId}_${i}.jpg`;
        const imagePath = join(imageDir, imageName);
        await writeFile(imagePath, buffer);
        imagePaths.push(`custom/${imageName}`);
      }
    }

    const exercise = {
      id: exerciseId,
      name,
      description,
      primaryMuscles: JSON.stringify(primaryMuscles),
      secondaryMuscles: JSON.stringify(secondaryMuscles),
      level,
      category,
      equipment,
      instructions,
      images: JSON.stringify(imagePaths),
      isCustom: 1,
      userId,
    };

    await db.insert(schema.customExercises).values(exercise);

    return NextResponse.json({
      ...exercise,
      primaryMuscles,
      secondaryMuscles,
      images: imagePaths,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error creating custom exercise:', error);
    return NextResponse.json({ error: 'Failed to create exercise' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const userId = await getUserId();
    const db = await getDb();
    const exercises = await db
      .select()
      .from(schema.customExercises)
      .where(eq(schema.customExercises.userId, userId));
    
    return NextResponse.json(exercises.map(ex => ({
      ...ex,
      primaryMuscles: JSON.parse(ex.primaryMuscles),
      secondaryMuscles: JSON.parse(ex.secondaryMuscles),
      images: JSON.parse(ex.images),
      instructions: ex.instructions ? ex.instructions.split('\n').filter(Boolean) : [],
    })));
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching custom exercises:', error);
    return NextResponse.json({ error: 'Failed to fetch exercises' }, { status: 500 });
  }
}

