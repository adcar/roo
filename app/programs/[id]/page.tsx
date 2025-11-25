'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Program } from '@/types/exercise';
import { useExercises } from '@/hooks/useExercises';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Edit } from 'lucide-react';

export default function ProgramViewPage() {
  const params = useParams();
  const { exercises } = useExercises();
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetch(`/api/programs/${params.id}`)
        .then(res => {
          if (!res.ok) {
            throw new Error('Program not found');
          }
          return res.json();
        })
        .then(data => {
          setProgram(data);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error loading program:', error);
          setLoading(false);
        });
    }
  }, [params.id]);

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

  if (!program) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold mb-4">Program not found</div>
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              ← Back to Programs
            </Button>
          </Link>
          <h1 className="text-4xl font-bold mt-4 mb-2">{program.name}</h1>
          <p className="text-muted-foreground">{program.days.length} workout day(s)</p>
        </div>

        <div className="mb-6 flex gap-4">
          <Link href={`/workout?programId=${program.id}`}>
            <Button size="lg">Start Workout</Button>
          </Link>
          <Link href={`/programs/${program.id}/edit`}>
            <Button size="lg" variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit Program
            </Button>
          </Link>
        </div>

        <div className="space-y-6">
          {program.days.map(day => {
            const isSplit = program.isSplit !== false; // Default to true for backward compatibility
            return (
              <Card key={day.id}>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold mb-4">{day.name}</h2>

                  <div className={`grid gap-6 ${isSplit ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
                    {(['A', 'B'] as const).filter(week => isSplit || week === 'A').map(week => (
                      <div key={week} className="bg-muted rounded-lg p-4">
                        {isSplit && <h3 className="text-xl font-semibold mb-4">Week {week}</h3>}

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
            );
          })}
        </div>
      </div>
    </div>
  );
}
