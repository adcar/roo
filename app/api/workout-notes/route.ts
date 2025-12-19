import { NextRequest, NextResponse } from 'next/server';
import { getDb, schema } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// GET: Fetch workout notes (by programId, dayId, week, exerciseId)
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const programId = searchParams.get('programId');
  const dayId = searchParams.get('dayId');
  const week = searchParams.get('week');
  const exerciseId = searchParams.get('exerciseId');

  if (!programId || !dayId || !week || !exerciseId) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const notes = await db
      .select()
      .from(schema.workoutNotes)
      .where(
        and(
          eq(schema.workoutNotes.userId, session.user.id),
          eq(schema.workoutNotes.programId, programId),
          eq(schema.workoutNotes.dayId, dayId),
          eq(schema.workoutNotes.week, week),
          eq(schema.workoutNotes.exerciseId, exerciseId)
        )
      );

    if (notes.length === 0) {
      return NextResponse.json({ notes: null });
    }

    const notesData = notes[0];
    return NextResponse.json({
      notes: {
        id: notesData.id,
        programId: notesData.programId,
        dayId: notesData.dayId,
        week: notesData.week,
        exerciseId: notesData.exerciseId,
        notes: notesData.notes || '',
        createdAt: notesData.createdAt,
        updatedAt: notesData.updatedAt,
      }
    });
  } catch (error) {
    console.error('Error fetching workout notes:', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

// POST/PUT: Save workout notes
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { programId, dayId, week, exerciseId, notes } = body;

    if (!programId || !dayId || !week || !exerciseId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = await getDb();
    const now = new Date().toISOString();
    const userId = session.user.id;

    // Check if notes already exist
    const existingNotes = await db
      .select()
      .from(schema.workoutNotes)
      .where(
        and(
          eq(schema.workoutNotes.userId, userId),
          eq(schema.workoutNotes.programId, programId),
          eq(schema.workoutNotes.dayId, dayId),
          eq(schema.workoutNotes.week, week),
          eq(schema.workoutNotes.exerciseId, exerciseId)
        )
      );

    if (existingNotes.length > 0) {
      // Update existing notes
      await db
        .update(schema.workoutNotes)
        .set({
          notes: notes || '',
          updatedAt: now,
        })
        .where(eq(schema.workoutNotes.id, existingNotes[0].id));

      return NextResponse.json({
        id: existingNotes[0].id,
        notes: notes || '',
        updatedAt: now,
      });
    } else {
      // Create new notes
      const id = `${userId}-${programId}-${dayId}-${week}-${exerciseId}`;
      await db.insert(schema.workoutNotes).values({
        id,
        programId,
        dayId,
        week,
        exerciseId,
        notes: notes || '',
        userId,
        createdAt: now,
        updatedAt: now,
      });

      return NextResponse.json({
        id,
        notes: notes || '',
        updatedAt: now,
      });
    }
  } catch (error) {
    console.error('Error saving workout notes:', error);
    return NextResponse.json({ error: 'Failed to save notes' }, { status: 500 });
  }
}






