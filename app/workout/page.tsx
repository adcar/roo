'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Program, WorkoutDay, ExerciseLog, SetLog, WorkoutLog } from '@/types/exercise';
import { useExercises } from '@/hooks/useExercises';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ArrowLeft, Check, ChevronRight, ChevronLeft, X } from 'lucide-react';
import Model, { IExerciseData, Muscle } from 'react-body-highlighter';
import { toast } from '@/components/ui/toast';

function WorkoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const programId = searchParams?.get('programId');
  const dayId = searchParams?.get('dayId');
  const { exercises } = useExercises();
  const [program, setProgram] = useState<Program | null>(null);
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<'A' | 'B'>('A');
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [highlightedMuscle, setHighlightedMuscle] = useState<string | null>(null);
  const [clickedMuscle, setClickedMuscle] = useState<{ muscle: string; view: 'anterior' | 'posterior' } | null>(null);
  const [themeColors, setThemeColors] = useState<string[]>(['#ef4444', '#f59e0b', '#10b981']);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  useEffect(() => {
    if (programId) {
      fetch(`/api/programs/${programId}`)
        .then(res => res.json())
        .then(data => {
          // Handle error responses
          if (data.error) {
            console.error('Error fetching program:', data.error);
            return;
          }
          setProgram(data);
          if (dayId) {
            const day = data.days?.find((d: WorkoutDay) => d.id === dayId);
            if (day) setSelectedDay(day);
          } else if (data.days?.length > 0) {
            setSelectedDay(data.days[0]);
          }
        })
        .catch(error => {
          console.error('Error loading program:', error);
        });
    }
  }, [programId, dayId]);

  useEffect(() => {
    if (selectedDay && programId && dayId) {
      const exercises = selectedWeek === 'A' ? selectedDay.weekA : selectedDay.weekB;
      
      // Fetch previous workout logs for this program/day/week
      fetch(`/api/workout-logs?programId=${programId}&dayId=${dayId}`)
        .then(res => res.json())
        .then((previousLogs: WorkoutLog[] | { error?: string }) => {
          // Handle error responses
          if (!Array.isArray(previousLogs)) {
            console.error('Error fetching workout logs:', previousLogs);
            return;
          }
          // Filter logs for the same week and sort by date (most recent first)
          const weekLogs = previousLogs
            .filter(log => log.week === selectedWeek)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
          // Get the most recent log if it exists
          const mostRecentLog = weekLogs.length > 0 ? weekLogs[0] : null;
          
          // Initialize logs with defaults (either from last workout or program defaults)
          const logs: ExerciseLog[] = exercises.map(ex => {
            // Try to find this exercise in the most recent log
            const previousExerciseLog = mostRecentLog?.exercises.find(
              (e: ExerciseLog) => e.exerciseId === ex.exerciseId
            );
            
            // Initialize sets - use last workout's set count if available, otherwise program default
            const setCount = previousExerciseLog?.sets.length || ex.sets || 0;
            
            // Program defaults
            const defaultReps = ex.reps || 0;
            const defaultWeight = ex.weight || 0;
            
            return {
              exerciseId: ex.exerciseId,
              sets: Array(setCount).fill(null).map((_, setIndex) => {
                // Try to get values from the same set index in previous workout
                if (previousExerciseLog && previousExerciseLog.sets[setIndex]) {
                  const previousSet = previousExerciseLog.sets[setIndex];
                  if (previousSet.completed && previousSet.reps !== undefined && previousSet.weight !== undefined) {
                    return {
                      reps: previousSet.reps,
                      weight: previousSet.weight,
                      completed: false,
                    };
                  }
                }
                
                // Fall back to program defaults or last set's values if this set doesn't exist
                if (previousExerciseLog && previousExerciseLog.sets.length > 0) {
                  // If this set index doesn't exist, use the last completed set's values
                  const completedSets = previousExerciseLog.sets.filter((s: SetLog) => s.completed);
                  if (completedSets.length > 0) {
                    const lastSet = completedSets[completedSets.length - 1];
                    if (lastSet.reps !== undefined && lastSet.weight !== undefined) {
                      return {
                        reps: lastSet.reps,
                        weight: lastSet.weight,
                        completed: false,
                      };
                    }
                  }
                }
                
                // Final fallback to program defaults
                return {
                  reps: defaultReps,
                  weight: defaultWeight,
                  completed: false,
                };
              }),
            };
          });
          
          setExerciseLogs(logs);
        })
        .catch(err => {
          console.error('Error fetching previous logs:', err);
          // Fallback to program defaults if fetch fails
          const logs: ExerciseLog[] = exercises.map(ex => ({
            exerciseId: ex.exerciseId,
            sets: Array(ex.sets || 0).fill(null).map(() => ({
              reps: ex.reps || 0,
              weight: ex.weight || 0,
              completed: false,
            })),
          }));
          setExerciseLogs(logs);
        });
    }
  }, [selectedDay, selectedWeek, programId, dayId]);

  const currentExercises = selectedDay
    ? (selectedWeek === 'A' ? selectedDay.weekA : selectedDay.weekB)
    : [];

  const currentProgramExercise = currentExercises[currentExerciseIndex];
  const currentExercise = currentProgramExercise
    ? exercises.find(ex => ex.id === currentProgramExercise.exerciseId)
    : null;
  const currentLog = exerciseLogs[currentExerciseIndex];

  const updateSetLog = (setIndex: number, updates: Partial<SetLog>) => {
    const newLogs = [...exerciseLogs];
    newLogs[currentExerciseIndex].sets[setIndex] = {
      ...newLogs[currentExerciseIndex].sets[setIndex],
      ...updates,
    };
    setExerciseLogs(newLogs);
  };


  // Map exercise muscle names to react-body-highlighter format
  const mapMuscleName = (muscle: string): Muscle | null => {
    const mapping: Record<string, Muscle> = {
      'chest': 'chest',
      'biceps': 'biceps',
      'triceps': 'triceps',
      'forearms': 'forearm',
      'shoulders': 'front-deltoids', // Default to front deltoids
      'abdominals': 'abs',
      'quadriceps': 'quadriceps',
      'hamstrings': 'hamstring',
      'calves': 'calves',
      'glutes': 'gluteal',
      'lats': 'upper-back',
      'lower back': 'lower-back',
      'middle back': 'upper-back',
      'traps': 'trapezius',
      'adductors': 'adductor',
      'abductors': 'abductors',
    };
    return mapping[muscle.toLowerCase()] || null;
  };

  // Prepare exercise data for react-body-highlighter
  // The library uses frequency-based coloring: array[frequency-1] = color
  // Primary muscles appear once (frequency = 1, gets highlightedColors[0] = red)
  // Secondary muscles appear twice (frequency = 2, gets highlightedColors[1] = orange)
  // If a muscle is highlighted (clicked badge), it appears 3 times (frequency = 3, gets highlightedColors[2])
  const getExerciseData = (): IExerciseData[] => {
    if (!currentExercise) return [];
    
    const primaryMuscles = currentExercise.primaryMuscles
      .map(mapMuscleName)
      .filter((m): m is Muscle => m !== null);
    
    const secondaryMuscles = currentExercise.secondaryMuscles
      .map(mapMuscleName)
      .filter((m): m is Muscle => m !== null)
      .filter(m => !primaryMuscles.includes(m)); // Exclude muscles that are already primary

    const data: IExerciseData[] = [];
    
    // Primary muscles appear once (frequency = 1, gets highlightedColors[0] = red)
    if (primaryMuscles.length > 0) {
      data.push({
        name: currentExercise.name,
        muscles: primaryMuscles,
      });
    }
    
    // Secondary muscles appear twice (frequency = 2, gets highlightedColors[1] = orange)
    // This ensures they get a different color than primary muscles
    if (secondaryMuscles.length > 0) {
      data.push({
        name: `${currentExercise.name} (secondary)`,
        muscles: secondaryMuscles,
      });
      // Add again to increase frequency to 2
      data.push({
        name: `${currentExercise.name} (secondary)`,
        muscles: secondaryMuscles,
      });
    }

    // If a muscle is highlighted (from badge click), add it multiple times to make it stand out
    if (highlightedMuscle) {
      const mappedHighlighted = mapMuscleName(highlightedMuscle);
      if (mappedHighlighted) {
        // Add it 3 more times (total frequency = 3+) to make it stand out with a different color
        for (let i = 0; i < 3; i++) {
          data.push({
            name: `${currentExercise.name} (highlighted)`,
            muscles: [mappedHighlighted],
          });
        }
      }
    }

    return data;
  };

  const handleMuscleClick = (muscleStats: { muscle: string; data: any }, view: 'anterior' | 'posterior') => {
    setClickedMuscle({ muscle: muscleStats.muscle, view });
    // Clear after 2 seconds
    setTimeout(() => setClickedMuscle(null), 2000);
  };

  const handleBadgeClick = (muscle: string) => {
    const mappedMuscle = mapMuscleName(muscle);
    if (mappedMuscle) {
      // Toggle highlight - if already highlighted, clear it
      if (highlightedMuscle === muscle) {
        setHighlightedMuscle(null);
      } else {
        setHighlightedMuscle(muscle);
      }
    }
  };

  // Get theme colors for the body highlighter
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Get computed colors from CSS variables
    const root = document.documentElement;
    const primaryVar = getComputedStyle(root).getPropertyValue('--primary').trim();
    const secondaryVar = getComputedStyle(root).getPropertyValue('--secondary').trim();
    
    // Create temporary elements to get computed RGB values
    const tempEl = document.createElement('div');
    tempEl.style.position = 'absolute';
    tempEl.style.visibility = 'hidden';
    tempEl.style.color = primaryVar;
    document.body.appendChild(tempEl);
    const primaryColor = getComputedStyle(tempEl).color;
    
    tempEl.style.color = secondaryVar;
    const secondaryColor = getComputedStyle(tempEl).color;
    
    document.body.removeChild(tempEl);
    
    setThemeColors([primaryColor || '#ef4444', secondaryColor || '#f59e0b', '#10b981']);
  }, []);

  // Check if we need to show the back view (posterior)
  const needsBackView = (): boolean => {
    if (!currentExercise) return false;
    const backMuscles: Muscle[] = ['lower-back', 'upper-back', 'trapezius', 'back-deltoids', 'hamstring', 'gluteal'];
    const allMappedMuscles = [
      ...currentExercise.primaryMuscles.map(mapMuscleName),
      ...currentExercise.secondaryMuscles.map(mapMuscleName),
    ].filter((m): m is Muscle => m !== null);
    
    return allMappedMuscles.some(muscle => backMuscles.includes(muscle));
  };

  const toggleSetComplete = (setIndex: number) => {
    updateSetLog(setIndex, {
      completed: !currentLog.sets[setIndex].completed,
    });
  };

  const nextExercise = () => {
    if (currentExerciseIndex < currentExercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    }
  };

  const previousExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(currentExerciseIndex - 1);
    }
  };

  const finishWorkout = async () => {
    if (!program || !selectedDay) return;

    const workoutLog = {
      programId: program.id,
      dayId: selectedDay.id,
      week: selectedWeek,
      date: new Date().toISOString(),
      exercises: exerciseLogs,
    };

    try {
      await fetch('/api/workout-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workoutLog),
      });
      
      // Show confetti
      const confetti = (await import('canvas-confetti')).default;
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      toast('Workout completed! 🎉', {
        description: 'Great job! Your progress has been saved.',
        variant: 'success'
      });
      
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch (error) {
      console.error('Error logging workout:', error);
      toast('Failed to log workout', {
        description: 'Please try again.',
        variant: 'destructive'
      });
    }
  };

  if (!program || !selectedDay) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground mb-4">Loading workout...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentExercises.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground text-lg">No exercises for this day/week combination</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">{program.name}</h1>
          <p className="text-muted-foreground">{selectedDay.name} • Week {selectedWeek}</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <Badge variant="outline" className="mb-2">
                  Exercise {currentExerciseIndex + 1} of {currentExercises.length}
                </Badge>
                <CardTitle className="text-3xl">{currentExercise?.name}</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {currentExercise && (
              <>
                <div className="mb-6">
                  <h3 className="font-semibold mb-3">Muscles Worked</h3>
                  
                  <div className="flex flex-col md:flex-row items-start gap-4">
                    {/* Body Models */}
                    <div className="flex-shrink-0 flex gap-3">
                      {/* Front View */}
                      <div>
                        <div className="text-xs text-muted-foreground mb-1 text-center">Front</div>
                        <div className="relative">
                          <Model
                            data={getExerciseData()}
                            highlightedColors={themeColors} // Primary, Secondary, Green for highlighted
                            style={{ width: '150px', height: '210px' }}
                            bodyColor="#e5e7eb"
                            type="anterior"
                            onClick={(muscleStats) => handleMuscleClick(muscleStats, 'anterior')}
                          />
                          {clickedMuscle && clickedMuscle.view === 'anterior' && (
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                              {clickedMuscle.muscle}
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Back View - only show if needed */}
                      {needsBackView() && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1 text-center">Back</div>
                          <div className="relative">
                            <Model
                              data={getExerciseData()}
                              highlightedColors={themeColors} // Primary, Secondary, Green for highlighted
                              style={{ width: '150px', height: '210px' }}
                              bodyColor="#e5e7eb"
                              type="posterior"
                              onClick={(muscleStats) => handleMuscleClick(muscleStats, 'posterior')}
                            />
                            {clickedMuscle && clickedMuscle.view === 'posterior' && (
                              <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                {clickedMuscle.muscle}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Muscle List */}
                    <div className="flex-1">
                      <div className="space-y-3">
                        {currentExercise.primaryMuscles.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <div className="w-3 h-3 rounded bg-primary"></div>
                              <span className="text-xs font-medium text-muted-foreground">Primary</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {currentExercise.primaryMuscles.map(muscle => {
                                const mappedMuscle = mapMuscleName(muscle);
                                const isHighlighted = highlightedMuscle === muscle && mappedMuscle;
                                return (
                                  <Badge 
                                    key={muscle} 
                                    className={`${isHighlighted ? 'bg-green-500 hover:bg-green-600 ring-2 ring-green-300' : 'bg-primary text-primary-foreground hover:bg-primary/90'} border-0 text-xs cursor-pointer transition-all`}
                                    onClick={() => handleBadgeClick(muscle)}
                                  >
                                    {muscle}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {currentExercise.secondaryMuscles.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <div className="w-3 h-3 rounded bg-secondary"></div>
                              <span className="text-xs font-medium text-muted-foreground">Secondary</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {currentExercise.secondaryMuscles.map(muscle => {
                                const mappedMuscle = mapMuscleName(muscle);
                                const isHighlighted = highlightedMuscle === muscle && mappedMuscle;
                                return (
                                  <Badge 
                                    key={muscle} 
                                    className={`${isHighlighted ? 'bg-green-500 hover:bg-green-600 ring-2 ring-green-300' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'} border-0 text-xs cursor-pointer transition-all`}
                                    onClick={() => handleBadgeClick(muscle)}
                                  >
                                    {muscle}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Exercise Images - Desktop only in flex */}
                    {currentExercise.images.length > 0 && (
                      <div className="hidden md:block flex-shrink-0">
                        <div className="grid grid-cols-2 gap-2">
                          {currentExercise.images.map((img, idx) => (
                            <div 
                              key={idx} 
                              className="relative w-[28rem] aspect-[850/567] rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setExpandedImage(img)}
                            >
                              <Image
                                src={`/exercise-images/${img}`}
                                alt={`${currentExercise.name} ${idx + 1}`}
                                fill
                                className="object-contain"
                                sizes="448px"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Exercise Images - Mobile only, below muscles section */}
                  {currentExercise.images.length > 0 && (
                    <div className="md:hidden mt-4">
                      <div className="grid grid-cols-1 gap-2">
                        {currentExercise.images.map((img, idx) => (
                          <div 
                            key={idx} 
                            className="relative w-full aspect-[850/567] rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setExpandedImage(img)}
                          >
                            <Image
                              src={`/exercise-images/${img}`}
                              alt={`${currentExercise.name} ${idx + 1}`}
                              fill
                              className="object-contain"
                              sizes="100vw"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Separator className="my-6" />

                <div>
                  <h3 className="font-semibold text-lg mb-4">Track Your Sets</h3>
                  <div className="space-y-1.5">
                    {currentLog?.sets.map((set, setIdx) => (
                      <div
                        key={setIdx}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                          set.completed
                            ? 'bg-primary/10 border-primary/30 dark:bg-primary/20'
                            : 'bg-card border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                          {setIdx + 1}
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <div className="relative">
                            <Input
                              type="number"
                              value={set.reps || ''}
                              onChange={(e) => updateSetLog(setIdx, { reps: parseInt(e.target.value) || 0 })}
                              className="h-9 pr-8 text-sm"
                              placeholder="0"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                              reps
                            </span>
                          </div>
                          <div className="relative">
                            <Input
                              type="number"
                              value={set.weight || ''}
                              onChange={(e) => updateSetLog(setIdx, { weight: parseFloat(e.target.value) || 0 })}
                              className="h-9 pr-8 text-sm"
                              placeholder="0"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                              lbs
                            </span>
                          </div>
                        </div>
                        <Button
                          variant={set.completed ? "default" : "ghost"}
                          size="sm"
                          onClick={() => toggleSetComplete(setIdx)}
                          className={`flex-shrink-0 h-9 w-9 p-0 ${
                            set.completed
                              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                              : 'hover:bg-muted'
                          }`}
                        >
                          {set.completed ? (
                            <X className="h-4 w-4" />
                          ) : (
                            <Check className="h-4 w-4 opacity-50" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Expanded Image Dialog */}
        <Dialog open={!!expandedImage} onOpenChange={(open) => !open && setExpandedImage(null)}>
          <DialogContent className="max-w-4xl p-0">
            {expandedImage && (
              <div className="relative w-full aspect-[850/567] bg-muted">
                <Image
                  src={`/exercise-images/${expandedImage}`}
                  alt={`${currentExercise?.name || 'Exercise'} - Expanded view`}
                  fill
                  className="object-contain"
                  sizes="100vw"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={previousExercise}
            disabled={currentExerciseIndex === 0}
            className="flex-1"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          {currentExerciseIndex === currentExercises.length - 1 ? (
            <Button onClick={finishWorkout} className="flex-1" size="lg">
              Finish Workout
            </Button>
          ) : (
            <Button onClick={nextExercise} className="flex-1">
              Next Exercise
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WorkoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-2xl">Loading...</div>
      </div>
    }>
      <WorkoutContent />
    </Suspense>
  );
}
