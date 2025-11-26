'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Program } from '@/types/exercise';
import { useExercises } from '@/hooks/useExercises';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BodyHighlighter, IExerciseData, Muscle } from '@/components/BodyHighlighter';
import { mapMuscleName } from '@/components/ExercisesTab/utils';
import { Edit } from 'lucide-react';

export default function ProgramViewPage() {
  const params = useParams();
  const { exercises } = useExercises();
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDayId, setSelectedDayId] = useState<string>('all');
  const [selectedWeek, setSelectedWeek] = useState<'A' | 'B' | 'both'>('both');

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

  // Collect all exercises from selected day(s) and map muscles
  const exerciseData = useMemo((): IExerciseData[] => {
    if (!program) return [];

    const selectedDays = selectedDayId === 'all' 
      ? program.days 
      : program.days.filter(day => day.id === selectedDayId);

    // Collect all unique exercise IDs
    const allExerciseIds = new Set<string>();
    
    selectedDays.forEach(day => {
      const isSplit = program.isSplit !== false;
      
      // Collect exercises based on selected week
      if (selectedWeek === 'A' || selectedWeek === 'both') {
        day.weekA.forEach(programExercise => {
          allExerciseIds.add(programExercise.exerciseId);
        });
      }
      
      // Collect exercises from Week B if split program and selected
      if (isSplit && (selectedWeek === 'B' || selectedWeek === 'both')) {
        day.weekB.forEach(programExercise => {
          allExerciseIds.add(programExercise.exerciseId);
        });
      }
    });

    // Aggregate all muscles across all exercises
    // Track which muscles are primary vs secondary
    const primaryMuscleSet = new Set<Muscle>();
    const secondaryMuscleSet = new Set<Muscle>();

    Array.from(allExerciseIds).forEach(exerciseId => {
      const exercise = exercises.find(ex => ex.id === exerciseId);
      if (!exercise) return;

      // Map and collect primary muscles
      exercise.primaryMuscles.forEach(muscle => {
        const mapped = mapMuscleName(muscle);
        if (mapped) {
          primaryMuscleSet.add(mapped);
          // Remove from secondary if it was there (primary takes precedence)
          secondaryMuscleSet.delete(mapped);
        }
      });

      // Map and collect secondary muscles (only if not already primary)
      exercise.secondaryMuscles.forEach(muscle => {
        const mapped = mapMuscleName(muscle);
        if (mapped && !primaryMuscleSet.has(mapped)) {
          secondaryMuscleSet.add(mapped);
        }
      });
    });

    // Create exercise data structure
    // Primary muscles appear once (frequency = 1, gets red color)
    // Secondary muscles appear twice (frequency = 2, gets orange color)
    const muscleData: IExerciseData[] = [];

    if (primaryMuscleSet.size > 0) {
      muscleData.push({ 
        name: 'Primary Muscles', 
        muscles: Array.from(primaryMuscleSet) 
      });
    }

    if (secondaryMuscleSet.size > 0) {
      const secondaryMusclesArray = Array.from(secondaryMuscleSet);
      // Add twice to get orange color (frequency = 2)
      muscleData.push({ 
        name: 'Secondary Muscles', 
        muscles: secondaryMusclesArray 
      });
      muscleData.push({ 
        name: 'Secondary Muscles', 
        muscles: secondaryMusclesArray 
      });
    }

    return muscleData;
  }, [program, selectedDayId, selectedWeek, exercises]);

  // Collect muscle names for badge display
  const muscleBadges = useMemo(() => {
    if (!program) return { primary: [], secondary: [] };

    const selectedDays = selectedDayId === 'all' 
      ? program.days 
      : program.days.filter(day => day.id === selectedDayId);

    const allExerciseIds = new Set<string>();
    
    selectedDays.forEach(day => {
      const isSplit = program.isSplit !== false;
      
      if (selectedWeek === 'A' || selectedWeek === 'both') {
        day.weekA.forEach(programExercise => {
          allExerciseIds.add(programExercise.exerciseId);
        });
      }
      
      if (isSplit && (selectedWeek === 'B' || selectedWeek === 'both')) {
        day.weekB.forEach(programExercise => {
          allExerciseIds.add(programExercise.exerciseId);
        });
      }
    });

    const primaryMuscleSet = new Set<string>();
    const secondaryMuscleSet = new Set<string>();

    Array.from(allExerciseIds).forEach(exerciseId => {
      const exercise = exercises.find(ex => ex.id === exerciseId);
      if (!exercise) return;

      exercise.primaryMuscles.forEach(muscle => {
        primaryMuscleSet.add(muscle);
        secondaryMuscleSet.delete(muscle);
      });

      exercise.secondaryMuscles.forEach(muscle => {
        if (!primaryMuscleSet.has(muscle)) {
          secondaryMuscleSet.add(muscle);
        }
      });
    });

    return {
      primary: Array.from(primaryMuscleSet).sort(),
      secondary: Array.from(secondaryMuscleSet).sort()
    };
  }, [program, selectedDayId, selectedWeek, exercises]);

  // Check if back view is needed
  const needsBackView = useMemo(() => {
    if (!program) return false;
    const backMuscles = ['lats', 'middle back', 'lower back', 'traps'];
    
    const selectedDays = selectedDayId === 'all' 
      ? program.days 
      : program.days.filter(day => day.id === selectedDayId);

    const allExerciseIds = new Set<string>();
    selectedDays.forEach(day => {
      const isSplit = program.isSplit !== false;
      
      if (selectedWeek === 'A' || selectedWeek === 'both') {
        day.weekA.forEach(ex => allExerciseIds.add(ex.exerciseId));
      }
      
      if (isSplit && (selectedWeek === 'B' || selectedWeek === 'both')) {
        day.weekB.forEach(ex => allExerciseIds.add(ex.exerciseId));
      }
    });

    return Array.from(allExerciseIds).some(exerciseId => {
      const exercise = exercises.find(ex => ex.id === exerciseId);
      if (!exercise) return false;
      return [...exercise.primaryMuscles, ...exercise.secondaryMuscles].some(
        m => backMuscles.includes(m.toLowerCase())
      );
    });
  }, [program, selectedDayId, selectedWeek, exercises]);

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
          <Link href="/programs">
            <Button variant="outline">Back to Programs</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/programs">
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

        {/* Muscle Visualization */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h2 className="text-2xl font-bold">Muscles Worked</h2>
              <div className="flex gap-2">
                <Select value={selectedDayId} onValueChange={setSelectedDayId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Days</SelectItem>
                    {program.days.map(day => (
                      <SelectItem key={day.id} value={day.id}>
                        {day.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {program.isSplit !== false && (
                  <Select value={selectedWeek} onValueChange={(value) => setSelectedWeek(value as 'A' | 'B' | 'both')}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Select week" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Both Weeks</SelectItem>
                      <SelectItem value="A">Week A</SelectItem>
                      <SelectItem value="B">Week B</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {exerciseData.length > 0 ? (
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="flex-shrink-0 flex gap-2 md:gap-4 justify-center md:justify-start w-full md:w-auto">
                  {/* Front View */}
                  <div>
                    <div className="text-xs text-muted-foreground mb-2 text-center">Front</div>
                    <BodyHighlighter
                      data={exerciseData}
                      style={{ width: '200px', height: '280px' }}
                      type="anterior"
                    />
                  </div>
                  {/* Back View */}
                  {needsBackView && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-2 text-center">Back</div>
                      <BodyHighlighter
                        data={exerciseData}
                        style={{ width: '200px', height: '280px' }}
                        type="posterior"
                      />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="space-y-3">
                    {muscleBadges.primary.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-3 h-3 rounded bg-primary"></div>
                          <span className="text-xs font-medium text-muted-foreground">Primary</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {muscleBadges.primary.map(muscle => (
                            <Badge 
                              key={muscle} 
                              className="bg-primary text-primary-foreground hover:bg-primary/90 border-0 text-xs"
                            >
                              {muscle}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {muscleBadges.secondary.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-3 h-3 rounded bg-secondary"></div>
                          <span className="text-xs font-medium text-muted-foreground">Secondary</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {muscleBadges.secondary.map(muscle => (
                            <Badge 
                              key={muscle} 
                              className="bg-secondary text-secondary-foreground hover:bg-secondary/80 border-0 text-xs"
                            >
                              {muscle}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No exercises found for the selected day(s)
              </p>
            )}
          </CardContent>
        </Card>

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
