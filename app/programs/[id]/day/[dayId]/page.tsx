'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Program, WorkoutDay } from '@/types/exercise';
import { useExercises } from '@/hooks/useExercises';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play } from 'lucide-react';

export default function DayViewPage() {
  const params = useParams();
  const { exercises } = useExercises();
  const [program, setProgram] = useState<Program | null>(null);
  const [day, setDay] = useState<WorkoutDay | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id && params.dayId) {
      fetch(`/api/programs/${params.id}`)
        .then(res => {
          if (!res.ok) {
            throw new Error('Program not found');
          }
          return res.json();
        })
        .then(data => {
          setProgram(data);
          const foundDay = data.days.find((d: WorkoutDay) => d.id === params.dayId);
          if (foundDay) {
            setDay(foundDay);
          }
          setLoading(false);
        })
        .catch(error => {
          console.error('Error loading program:', error);
          setLoading(false);
        });
    }
  }, [params.id, params.dayId]);

  const getExercise = (exerciseId: string) => {
    return exercises.find(ex => ex.id === exerciseId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-2xl">Loading...</div>
      </div>
    );
  }

  if (!program || !day) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold mb-4">Day not found</div>
          <Link href={`/programs/${params.id}`}>
            <Button variant="outline">Back to Program</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href={`/programs/${params.id}`}>
            <Button variant="ghost" className="mb-4">
              ← Back to Program
            </Button>
          </Link>
          <div className="mb-2">
            <Link href="/">
              <Button variant="ghost" size="sm" className="mb-2">
                ← All Programs
              </Button>
            </Link>
          </div>
          <h1 className="text-4xl font-bold mt-4 mb-2">{day.name}</h1>
          <p className="text-muted-foreground">
            From program: <span className="font-semibold">{program.name}</span>
          </p>
        </div>

        <div className="mb-6 flex gap-4">
          <Link href={`/workout?programId=${params.id}&dayId=${day.id}&week=A`}>
            <Button size="lg">
              <Play className="mr-2 h-4 w-4" />
              Start Week A
            </Button>
          </Link>
          <Link href={`/workout?programId=${params.id}&dayId=${day.id}&week=B`}>
            <Button size="lg" variant="outline">
              <Play className="mr-2 h-4 w-4" />
              Start Week B
            </Button>
          </Link>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              {(['A', 'B'] as const).map(week => (
                <div key={week} className="bg-muted rounded-lg p-4">
                  <h3 className="text-xl font-semibold mb-4">Week {week}</h3>

                  <div className="space-y-3">
                    {day[week === 'A' ? 'weekA' : 'weekB'].map((programExercise, idx) => {
                      const exercise = getExercise(programExercise.exerciseId);
                      if (!exercise) return null;

                      return (
                        <div key={idx} className="bg-background rounded-lg p-3 border">
                          <div className="flex gap-3">
                            {exercise.images[0] && (
                              <div className="relative w-20 h-20 bg-muted rounded overflow-hidden flex-shrink-0">
                                <Image
                                  src={`/exercise-images/${exercise.images[0]}`}
                                  alt={exercise.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )}
                            <div className="flex-1">
                              <h4 className="font-semibold mb-1">{exercise.name}</h4>
                              <div className="flex gap-3 text-sm text-muted-foreground">
                                {programExercise.sets && <span>{programExercise.sets} sets</span>}
                                {programExercise.reps && <span>× {programExercise.reps} reps</span>}
                                {programExercise.weight && <span>@ {programExercise.weight} lbs</span>}
                              </div>
                              {programExercise.notes && (
                                <div className="text-sm text-muted-foreground mt-1 italic">
                                  {programExercise.notes}
                                </div>
                              )}
                              <div className="flex flex-wrap gap-1 mt-2">
                                {exercise.primaryMuscles.map(muscle => (
                                  <span key={muscle} className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded-full">
                                    {muscle}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {day[week === 'A' ? 'weekA' : 'weekB'].length === 0 && (
                      <p className="text-muted-foreground text-center py-4">No exercises for this week</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

