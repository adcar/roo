import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getUserId } from '@/lib/auth-server';
import { getDb, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { Program, WorkoutDay, ProgramExercise } from '@/types/exercise';
import { readFileSync } from 'fs';
import { join } from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GenerateProgramRequest {
  fitnessGoals: string;
  workoutFrequency: number; // days per week
  preferIsolation: boolean; // if false, prefers full body/compound movements
  additionalNotes?: string;
}

function createStream() {
  const encoder = new TextEncoder();
  let streamController: ReadableStreamDefaultController<Uint8Array> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      streamController = controller;
    },
  });

  const send = (data: { type: string; content: any }) => {
    if (streamController) {
      const message = `data: ${JSON.stringify(data)}\n\n`;
      streamController.enqueue(encoder.encode(message));
    }
  };

  const close = () => {
    if (streamController) {
      streamController.close();
    }
  };

  return { stream, send, close };
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in your environment variables.' },
        { status: 500 }
      );
    }

    const userId = await getUserId();
    const body: GenerateProgramRequest = await request.json();
    const { fitnessGoals, workoutFrequency, preferIsolation, additionalNotes } = body;

    const { stream, send, close } = createStream();

    // Run async work
    (async () => {
      try {
        send({ type: 'status', content: 'Loading your settings and exercise database...' });

        // Get user settings
        const db = await getDb();
        const userSettings = await db
          .select()
          .from(schema.userSettings)
          .where(eq(schema.userSettings.userId, userId))
          .limit(1);

        const settings = userSettings[0] || {};
        const availableEquipment = settings.availableEquipment 
          ? JSON.parse(settings.availableEquipment) 
          : [];

        // Load exercises from file
        const exercisesPath = join(process.cwd(), 'public', 'exercises.json');
        const exercisesData = JSON.parse(readFileSync(exercisesPath, 'utf-8'));

        send({ type: 'status', content: `Filtering ${exercisesData.length} exercises based on your equipment...` });

        // Filter exercises based on available equipment
        const allEquipment = ['body only', 'other', ...(availableEquipment || [])];
        const filteredExercises = exercisesData.filter((ex: any) => {
          const exerciseEquipment = ex.equipment?.toLowerCase() || null;
          return exerciseEquipment === null || 
                 exerciseEquipment === 'body only' ||
                 exerciseEquipment === 'other' ||
                 allEquipment.some((eq: string) => eq.toLowerCase() === exerciseEquipment);
        });

        send({ type: 'status', content: `Found ${filteredExercises.length} exercises you can do with your equipment.` });

        // Build exercise list for prompt (simplified - just name, id, equipment, muscles, category)
        // Limit to 1000 exercises to avoid token limits, prioritizing strength exercises
        const strengthExercises = filteredExercises.filter((ex: any) => 
          ex.category === 'strength' || ex.category === 'powerlifting' || ex.category === 'strongman'
        );
        const otherExercises = filteredExercises.filter((ex: any) => 
          ex.category !== 'strength' && ex.category !== 'powerlifting' && ex.category !== 'strongman'
        );
        
        // Take up to 800 strength exercises and 200 others
        const selectedExercises = [
          ...strengthExercises.slice(0, 800),
          ...otherExercises.slice(0, 200),
        ].slice(0, 1000);

        const exerciseList = selectedExercises.map((ex: any) => ({
          id: ex.id,
          name: ex.name,
          equipment: ex.equipment,
          primaryMuscles: ex.primaryMuscles,
          secondaryMuscles: ex.secondaryMuscles,
          category: ex.category,
          level: ex.level,
          mechanic: ex.mechanic,
        }));

        // Create a Set of valid exercise IDs for fast lookup during validation
        const validExerciseIds = new Set(exerciseList.map((ex: any) => ex.id));

        send({ type: 'status', content: 'Analyzing your goals and creating a personalized program...' });

        // Build user context
        const userContext = [];
        if (settings.gender !== null && settings.gender !== undefined) {
          userContext.push(`Gender: ${settings.gender === 1 ? 'Male' : 'Female'}`);
        }
        if (settings.weight) userContext.push(`Weight: ${settings.weight}`);
        if (settings.height) userContext.push(`Height: ${settings.height}`);
        if (settings.bodyfatPercentage) userContext.push(`Body Fat: ${settings.bodyfatPercentage}`);
        if (availableEquipment && availableEquipment.length > 0) {
          userContext.push(`Available Equipment: ${availableEquipment.join(', ')}`);
        }

        // Determine program structure based on frequency
        let programStructure = '';
        if (workoutFrequency <= 2) {
          programStructure = 'full body workouts';
        } else if (workoutFrequency === 3) {
          programStructure = preferIsolation 
            ? 'a 3-day split (e.g., Push/Pull/Legs or Upper/Lower/Full Body)' 
            : 'full body workouts';
        } else if (workoutFrequency === 4) {
          programStructure = preferIsolation 
            ? 'an upper/lower split (2 upper days, 2 lower days)' 
            : 'full body workouts';
        } else if (workoutFrequency >= 5) {
          programStructure = preferIsolation 
            ? 'a 5-6 day split (e.g., Push/Pull/Legs or body part splits)' 
            : 'a 5-6 day full body program';
        }

        // Create the prompt
        const prompt = `You are an expert fitness coach creating a personalized workout program.

User Context:
${userContext.length > 0 ? userContext.join('\n') : 'No specific user stats provided.'}

Fitness Goals: ${fitnessGoals}
Workout Frequency: ${workoutFrequency} days per week
Program Structure: ${programStructure}
${additionalNotes ? `Additional Notes: ${additionalNotes}` : ''}

Available Exercises (${exerciseList.length} total, filtered from ${filteredExercises.length} based on your equipment):
${JSON.stringify(exerciseList, null, 2)}

CRITICAL EQUIPMENT CONSTRAINT:
- The exercises above have been PRE-FILTERED based on the user's available equipment
- You MUST ONLY use exercise IDs from the list above
- DO NOT suggest exercises that require equipment the user doesn't have
- All exercises in the list are compatible with the user's equipment: ${allEquipment.join(', ') || 'body only'}
- If an exercise requires equipment not listed, it has already been filtered out - do not use it

Create a workout program with the following structure:
- Program name (descriptive and motivating)
- ${workoutFrequency} workout days
- Each day should have 4-8 exercises
- For each exercise, specify:
  * exerciseId (MUST be one of the exercise IDs from the list above - no exceptions)
  * sets (typically 3-5)
  * reps (appropriate for the goal, e.g., 8-12 for hypertrophy, 4-6 for strength)
  * weight (optional, can be left null)
  * notes (optional tips or modifications)

Important:
- ONLY use exercise IDs that exist in the exercise list above - these are the ONLY exercises the user can do
- Choose exercises appropriate for the user's goals
- Balance muscle groups across the week
- Include proper warm-up considerations in notes if needed
- For full body days, include exercises for all major muscle groups
- For split days, focus on the target muscle groups

Return ONLY a valid JSON object matching this exact structure:
{
  "name": "Program Name",
  "days": [
    {
      "id": "day-1",
      "name": "Day Name",
      "weekA": [
        {
          "exerciseId": "exercise_id_from_list",
          "sets": 3,
          "reps": 10,
          "weight": null,
          "notes": "Optional notes"
        }
      ],
      "weekB": []
    }
  ],
  "isSplit": false
}

Note: If the program doesn't need Week A/B splits, set weekB to empty arrays and isSplit to false.`;

        send({ type: 'status', content: 'Sending request to AI...' });

        // Call OpenAI with streaming
        send({ type: 'status', content: 'AI is thinking...' });

        const completionStream = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert fitness coach. Always respond with valid JSON only, no markdown formatting, no explanations.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' },
          stream: true,
        });

        let responseContent = '';
        let lastUpdateTime = Date.now();
        
        for await (const chunk of completionStream) {
          const delta = chunk.choices[0]?.delta?.content || '';
          if (delta) {
            responseContent += delta;
            
            // Send progress updates every 500ms to show activity
            const now = Date.now();
            if (now - lastUpdateTime > 500) {
              send({ type: 'status', content: 'AI is generating your program...' });
              lastUpdateTime = now;
            }
          }
        }
        if (!responseContent) {
          throw new Error('No response from AI');
        }

        send({ type: 'status', content: 'Validating and formatting your program...' });

        // Parse the JSON response
        let programData: any;
        try {
          programData = JSON.parse(responseContent);
        } catch (e) {
          // Try to extract JSON from markdown code blocks if present
          const jsonMatch = responseContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
          if (jsonMatch) {
            programData = JSON.parse(jsonMatch[1]);
          } else {
            throw new Error('Invalid JSON response from AI');
          }
        }

        // Validate and normalize the program structure
        if (!programData.name || !programData.days || !Array.isArray(programData.days)) {
          throw new Error('Invalid program structure from AI');
        }

        // Ensure all exercises exist and add order fields
        // Filter out any exercises that aren't in our valid list (equipment filtering)
        const normalizedDays: WorkoutDay[] = programData.days.map((day: any, dayIndex: number) => {
          const normalizeExercises = (exercises: any[]): ProgramExercise[] => {
            const validExercises: ProgramExercise[] = [];
            const invalidExercises: string[] = [];
            
            exercises.forEach((ex: any) => {
              // Verify exercise exists in our filtered list (equipment check)
              if (!validExerciseIds.has(ex.exerciseId)) {
                invalidExercises.push(ex.exerciseId);
                console.warn(`Exercise ${ex.exerciseId} not in filtered list (equipment mismatch), skipping`);
                return;
              }
              
              validExercises.push({
                exerciseId: ex.exerciseId,
                sets: ex.sets || 3,
                reps: ex.reps || 10,
                weight: ex.weight || undefined,
                notes: ex.notes || undefined,
                order: validExercises.length,
              });
            });

            if (invalidExercises.length > 0) {
              console.warn(`Filtered out ${invalidExercises.length} exercises that don't match user's equipment:`, invalidExercises);
            }

            return validExercises;
          };

          return {
            id: day.id || `day-${dayIndex + 1}`,
            name: day.name || `Day ${dayIndex + 1}`,
            weekA: normalizeExercises(day.weekA || []),
            weekB: normalizeExercises(day.weekB || []),
          };
        });

        const program: Omit<Program, 'id' | 'createdAt' | 'updatedAt'> = {
          name: programData.name,
          days: normalizedDays,
          isSplit: programData.isSplit || false,
        };

        send({ type: 'complete', content: program });
        close();
      } catch (error) {
        send({ type: 'error', content: error instanceof Error ? error.message : 'Failed to generate program' });
        close();
      }
    })();

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error generating AI program:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate program' },
      { status: 500 }
    );
  }
}
