'use client';

import { useState, useEffect, Suspense, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Program, WorkoutDay, ExerciseLog, SetLog, WorkoutLog, Exercise } from '@/types/exercise';
import { useExercises } from '@/hooks/useExercises';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, Check, ChevronRight, ChevronLeft, X, Loader2, ChevronDown, ChevronUp, Image as ImageIcon, BicepsFlexed, BookOpen, FileText } from 'lucide-react';
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
  const [bodyColor, setBodyColor] = useState<string>('#6b7280');
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [showMobileImages, setShowMobileImages] = useState(false);
  const [showMusclesWorked, setShowMusclesWorked] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [workoutNotes, setWorkoutNotes] = useState<string>('');
  const [notesSaveTimeout, setNotesSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showFinishWarning, setShowFinishWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isFinishingRef = useRef(false);
  const [prefetchedExercises, setPrefetchedExercises] = useState<Map<number, Exercise>>(new Map());

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
          // If program is not split, always use week A
          const isSplit = data.isSplit !== false;
          if (!isSplit) {
            setSelectedWeek('A');
          } else {
            // Check URL params for week
            const weekParam = searchParams?.get('week');
            if (weekParam === 'A' || weekParam === 'B') {
              setSelectedWeek(weekParam);
            }
          }
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
  }, [programId, dayId, searchParams]);

  useEffect(() => {
    if (selectedDay && programId && dayId) {
      // For non-split programs, always use weekA
      const isSplit = program?.isSplit !== false;
      const effectiveWeek = isSplit ? selectedWeek : 'A';
      const programExercises = effectiveWeek === 'A' ? selectedDay.weekA : selectedDay.weekB;
      
      // Helper function to fetch workout logs
      const fetchWorkoutLogs = (progressDataRef: { progress?: any }) => {
        // No progress found, fetch previous workout logs for defaults
        fetch(`/api/workout-logs?programId=${programId}&dayId=${dayId}`)
          .then(res => res.json())
          .then((previousLogs: WorkoutLog[] | { error?: string }) => {
            // Handle error responses
            if (!Array.isArray(previousLogs)) {
              console.error('Error fetching workout logs:', previousLogs);
              return;
            }
            // Filter logs for the same week and sort by date (most recent first)
            // For non-split programs, treat all logs as week A
            const isSplit = program?.isSplit !== false;
            const effectiveWeek = isSplit ? selectedWeek : 'A';
            const weekLogs = previousLogs
              .filter(log => {
                if (!isSplit) return true; // For non-split, get all logs
                return log.week === selectedWeek;
              })
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            // Get the most recent log if it exists
            const mostRecentLog = weekLogs.length > 0 ? weekLogs[0] : null;
            
            // Initialize logs with defaults (either from last workout or program defaults)
            const logs: ExerciseLog[] = programExercises.map(ex => {
              // Try to find this exercise in the most recent log
              const previousExerciseLog = mostRecentLog?.exercises.find(
                (e: ExerciseLog) => e.exerciseId === ex.exerciseId
              );
              
              // Get exercise details to check if it's cardio
              const exerciseDetails = exercises.find(e => e.id === ex.exerciseId);
              const isCardio = exerciseDetails?.category === 'cardio';
              
              // Initialize sets - use last workout's set count if available, otherwise program default
              // For cardio, always use exactly 1 set
              const setCount = isCardio ? 1 : (previousExerciseLog?.sets.length || ex.sets || 0);
              
              // Program defaults
              const defaultReps = ex.reps || 0;
              const defaultWeight = ex.weight || 0;
              const defaultDistance = ex.distance || 0;
              
              return {
                exerciseId: ex.exerciseId,
                sets: Array(setCount).fill(null).map((_, setIndex) => {
                  // Try to get values from the same set index in previous workout
                  if (previousExerciseLog && previousExerciseLog.sets[setIndex]) {
                    const previousSet = previousExerciseLog.sets[setIndex];
                    if (isCardio) {
                      if (previousSet.completed && previousSet.distance !== undefined) {
                        return {
                          distance: previousSet.distance,
                          completed: false,
                        };
                      }
                    } else {
                    if (previousSet.completed && previousSet.reps !== undefined && previousSet.weight !== undefined) {
                      return {
                        reps: previousSet.reps,
                        weight: previousSet.weight,
                        completed: false,
                      };
                      }
                    }
                  }
                  
                  // Fall back to program defaults or last set's values if this set doesn't exist
                  if (previousExerciseLog && previousExerciseLog.sets.length > 0) {
                    // If this set index doesn't exist, use the last completed set's values
                    const completedSets = previousExerciseLog.sets.filter((s: SetLog) => s.completed);
                    if (completedSets.length > 0) {
                      const lastSet = completedSets[completedSets.length - 1];
                      if (isCardio) {
                        if (lastSet.distance !== undefined) {
                          return {
                            distance: lastSet.distance,
                            completed: false,
                          };
                        }
                      } else {
                      if (lastSet.reps !== undefined && lastSet.weight !== undefined) {
                        return {
                          reps: lastSet.reps,
                          weight: lastSet.weight,
                          completed: false,
                        };
                        }
                      }
                    }
                  }
                  
                  // Final fallback to program defaults
                  // For weight: if there's previous history, use that weight; otherwise leave empty (undefined)
                  // Only use program default weight if there's previous history (featured exercise)
                  if (isCardio) {
                    return {
                      distance: defaultDistance,
                      completed: false,
                    };
                  } else {
                  return {
                    reps: defaultReps,
                    weight: previousExerciseLog ? defaultWeight : undefined, // Empty for new exercises
                    completed: false,
                  };
                  }
                }),
              };
            });
            
            // Only set logs if we don't already have progress
            if (!progressDataRef.progress) {
              setExerciseLogs(logs);
            }
          })
          .catch(err => {
            console.error('Error fetching previous logs:', err);
            // Fallback to program defaults if fetch fails
            if (!progressDataRef.progress) {
              const logs: ExerciseLog[] = programExercises.map(ex => {
                const exerciseDetails = exercises.find(e => e.id === ex.exerciseId);
                const isCardio = exerciseDetails?.category === 'cardio';
                // For cardio, always use exactly 1 set
                const setCount = isCardio ? 1 : (ex.sets || 0);
                
                return {
                exerciseId: ex.exerciseId,
                  sets: Array(setCount).fill(null).map(() => {
                    if (isCardio) {
                      return {
                        distance: ex.distance || 0,
                        completed: false,
                      };
                } else {
                  return {
              reps: ex.reps || 0,
              weight: undefined, // Empty for new exercises (no previous history)
              completed: false,
                  };
                }
                  }),
                };
              });
              setExerciseLogs(logs);
            }
          });
      };
      
      // First, try to load existing progress
      fetch(`/api/workout-progress?programId=${programId}&dayId=${dayId}&week=${effectiveWeek}`)
        .then(res => res.json())
        .then((progressData: { progress?: any } | { error?: string }) => {
          if ('error' in progressData) {
            console.error('Error fetching progress:', progressData);
            // Continue to fetch workout logs even if progress fetch fails
            fetchWorkoutLogs({});
            return;
          }
          
          // TypeScript now knows progressData is { progress?: any }
          const progressDataTyped = progressData as { progress?: any };
          
          // If we have saved progress, use it
          if (progressDataTyped.progress) {
            const progress = progressDataTyped.progress;
            setCurrentExerciseIndex(progress.currentExerciseIndex || 0);
            
            // Normalize cardio exercises to have exactly 1 set
            const normalizedExercises = (progress.exercises || []).map((exerciseLog: ExerciseLog) => {
              const exerciseDetails = exercises.find(e => e.id === exerciseLog.exerciseId);
              const isCardio = exerciseDetails?.category === 'cardio';
              
              if (isCardio && exerciseLog.sets.length > 1) {
                // Keep only the first set for cardio exercises
                return {
                  ...exerciseLog,
                  sets: [exerciseLog.sets[0] || { distance: 0, completed: false }]
                };
              }
              
              return exerciseLog;
            });
            
            setExerciseLogs(normalizedExercises);
            if (progress.updatedAt) {
              setLastSavedAt(new Date(progress.updatedAt));
            }
            // Continue to fetch workout logs for defaults even if we have progress
          }
          
          fetchWorkoutLogs(progressDataTyped);
        })
        .catch(err => {
          console.error('Error fetching progress:', err);
          // If progress fetch fails, still initialize logs
          const programExercises = effectiveWeek === 'A' ? selectedDay.weekA : selectedDay.weekB;
          const logs: ExerciseLog[] = programExercises.map(ex => {
            const exerciseDetails = exercises.find(e => e.id === ex.exerciseId);
            const isCardio = exerciseDetails?.category === 'cardio';
            // For cardio, always use exactly 1 set
            const setCount = isCardio ? 1 : (ex.sets || 0);
            
            return {
            exerciseId: ex.exerciseId,
              sets: Array(setCount).fill(null).map(() => {
                if (isCardio) {
                  return {
                    distance: ex.distance || 0,
                    completed: false,
                  };
                } else {
                  return {
              reps: ex.reps || 0,
              weight: undefined, // Empty for new exercises (no previous history)
              completed: false,
                  };
                }
              }),
            };
          });
          setExerciseLogs(logs);
        });
    }
  }, [selectedDay, selectedWeek, programId, dayId, program, exercises]);

  const currentExercises = selectedDay
    ? (() => {
        const isSplit = program?.isSplit !== false;
        const effectiveWeek = isSplit ? selectedWeek : 'A';
        return effectiveWeek === 'A' ? selectedDay.weekA : selectedDay.weekB;
      })()
    : [];

  const currentProgramExercise = currentExercises[currentExerciseIndex];
  const currentExercise = prefetchedExercises.get(currentExerciseIndex) ||
    (currentProgramExercise
      ? exercises.find(ex => ex.id === currentProgramExercise.exerciseId)
      : null);
  const currentLog = exerciseLogs[currentExerciseIndex];

  const saveProgress = useCallback(async () => {
    if (!program || !selectedDay || !programId || !dayId || exerciseLogs.length === 0) return;
    
    const isSplit = program.isSplit !== false;
    const effectiveWeek = isSplit ? selectedWeek : 'A';
    
    setIsSaving(true);
    try {
      const res = await fetch('/api/workout-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programId,
          dayId,
          week: effectiveWeek,
          currentExerciseIndex,
          exercises: exerciseLogs,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.updatedAt) {
          setLastSavedAt(new Date(data.updatedAt));
        }
      }
    } catch (error) {
      console.error('Error saving progress:', error);
    } finally {
      setIsSaving(false);
    }
  }, [program, selectedDay, programId, dayId, selectedWeek, currentExerciseIndex, exerciseLogs]);

  // Create initial progress entry when logs are ready and no progress exists
  useEffect(() => {
    if (exerciseLogs.length > 0 && program && selectedDay && programId && dayId && !lastSavedAt) {
      // Small delay to ensure everything is initialized
      const timer = setTimeout(() => {
        saveProgress();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [exerciseLogs.length, program, selectedDay, programId, dayId, lastSavedAt, saveProgress]);

  // Reset notes when exercise changes
  useEffect(() => {
    setWorkoutNotes('');
  }, [programId, dayId, selectedWeek, currentExerciseIndex]);

  // Fetch workout notes
  useEffect(() => {
    if (!program || !selectedDay || !programId || !dayId || !currentExercise) return;

    const isSplit = program.isSplit !== false;
    const effectiveWeek = isSplit ? selectedWeek : 'A';

    fetch(`/api/workout-notes?programId=${programId}&dayId=${dayId}&week=${effectiveWeek}&exerciseId=${currentExercise.id}`)
      .then(res => res.json())
      .then((data: { notes?: { notes: string } | null } | { error?: string }) => {
        if ('error' in data) {
          console.error('Error fetching notes:', data);
          return;
        }
        // TypeScript now knows data is { notes?: { notes: string } | null }
        const notesData = data as { notes?: { notes: string } | null };
        if (notesData.notes) {
          setWorkoutNotes(notesData.notes.notes || '');
        } else {
          setWorkoutNotes('');
        }
      })
      .catch(error => {
        console.error('Error fetching notes:', error);
      });
  }, [program, selectedDay, programId, dayId, selectedWeek, currentExercise]);

  // Preload images for an exercise
  const preloadExerciseImages = useCallback((exercise: Exercise) => {
    if (exercise.images && exercise.images.length > 0 && typeof window !== 'undefined') {
      exercise.images.forEach(imageName => {
        const img = new window.Image();
        img.src = `/exercise-images/${imageName}`;
      });
    }
  }, []);

  // Prefetch exercise data for adjacent exercises
  const prefetchAdjacentExercises = useCallback(() => {
    const currentProgramExercises = selectedDay
      ? (() => {
          const isSplit = program?.isSplit !== false;
          const effectiveWeek = isSplit ? selectedWeek : 'A';
          return effectiveWeek === 'A' ? selectedDay.weekA : selectedDay.weekB;
        })()
      : [];

    // Prefetch next exercise
    if (currentExerciseIndex < currentProgramExercises.length - 1) {
      const nextExerciseId = currentProgramExercises[currentExerciseIndex + 1].exerciseId;
      if (!prefetchedExercises.has(currentExerciseIndex + 1)) {
        const nextExercise = exercises.find(ex => ex.id === nextExerciseId);
        if (nextExercise) {
          setPrefetchedExercises(prev => new Map(prev.set(currentExerciseIndex + 1, nextExercise)));
          // Preload images for the next exercise
          preloadExerciseImages(nextExercise);
        }
      }
    }

    // Prefetch previous exercise
    if (currentExerciseIndex > 0) {
      const prevExerciseId = currentProgramExercises[currentExerciseIndex - 1].exerciseId;
      if (!prefetchedExercises.has(currentExerciseIndex - 1)) {
        const prevExercise = exercises.find(ex => ex.id === prevExerciseId);
        if (prevExercise) {
          setPrefetchedExercises(prev => new Map(prev.set(currentExerciseIndex - 1, prevExercise)));
          // Preload images for the previous exercise
          preloadExerciseImages(prevExercise);
        }
      }
    }
  }, [currentExerciseIndex, selectedDay, selectedWeek, program, exercises, prefetchedExercises, preloadExerciseImages]);

  // Prefetch adjacent exercises when current exercise changes
  useEffect(() => {
    if (selectedDay && program) {
      prefetchAdjacentExercises();
    }
  }, [currentExerciseIndex, selectedDay, selectedWeek, program, prefetchAdjacentExercises]);

  const saveNotes = useCallback(async (notesToSave: string) => {
    if (!program || !selectedDay || !programId || !dayId || !currentExercise) return;

    const isSplit = program.isSplit !== false;
    const effectiveWeek = isSplit ? selectedWeek : 'A';

    try {
      await fetch('/api/workout-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programId,
          dayId,
          week: effectiveWeek,
          exerciseId: currentExercise.id,
          notes: notesToSave,
        }),
      });
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  }, [program, selectedDay, programId, dayId, selectedWeek, currentExercise]);

  const handleNotesChange = (value: string) => {
    setWorkoutNotes(value);
    
    // Auto-save with debouncing
    if (notesSaveTimeout) {
      clearTimeout(notesSaveTimeout);
    }
    const timeout = setTimeout(() => {
      saveNotes(value);
    }, 1000); // Save 1 second after last change
    setNotesSaveTimeout(timeout);
  };

  // Cleanup notes timeout on unmount
  useEffect(() => {
    return () => {
      if (notesSaveTimeout) {
        clearTimeout(notesSaveTimeout);
      }
    };
  }, [notesSaveTimeout]);

  const updateSetLog = (setIndex: number, updates: Partial<SetLog>) => {
    const newLogs = [...exerciseLogs];
    newLogs[currentExerciseIndex].sets[setIndex] = {
      ...newLogs[currentExerciseIndex].sets[setIndex],
      ...updates,
    };
    setExerciseLogs(newLogs);
    
    // Auto-save with debouncing
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    const timeout = setTimeout(() => {
      saveProgress();
    }, 1000); // Save 1 second after last change
    setSaveTimeout(timeout);
  };
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);


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
    
    const updateColors = () => {
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
      
      // Get background color (using muted for slightly different appearance)
      tempEl.className = 'bg-muted';
      const backgroundColor = getComputedStyle(tempEl).backgroundColor;
      
      document.body.removeChild(tempEl);
      
      setThemeColors([primaryColor || '#ef4444', secondaryColor || '#f59e0b', '#10b981']);
      setBodyColor(backgroundColor || '#6b7280');
    };

    updateColors();
    
    // Listen for theme changes
    const observer = new MutationObserver(updateColors);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
    
    return () => observer.disconnect();
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

  const nextExercise = async () => {
    if (currentExerciseIndex < currentExercises.length - 1) {
      // Save progress asynchronously (non-blocking)
      saveProgress();
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setShowMobileImages(false); // Reset images visibility when changing exercises
      setShowMusclesWorked(false); // Reset muscles visibility when changing exercises
      setShowInstructions(false); // Reset instructions visibility when changing exercises
      setShowNotes(false); // Reset notes visibility when changing exercises
    }
  };

  const previousExercise = async () => {
    if (currentExerciseIndex > 0) {
      // Save progress asynchronously (non-blocking)
      saveProgress();
      setCurrentExerciseIndex(currentExerciseIndex - 1);
      setShowMobileImages(false); // Reset images visibility when changing exercises
      setShowMusclesWorked(false); // Reset muscles visibility when changing exercises
      setShowInstructions(false); // Reset instructions visibility when changing exercises
      setShowNotes(false); // Reset notes visibility when changing exercises
    }
  };

  const finishWorkout = async () => {
    if (!program || !selectedDay || isFinishing || isSubmitting) return;

    // Check if there are any incomplete sets
    const hasIncompleteSets = exerciseLogs.some(exerciseLog => 
      exerciseLog.sets.some(set => !set.completed)
    );

    if (hasIncompleteSets) {
      setShowFinishWarning(true);
      return;
    }

    await performFinishWorkout();
  };

  const performFinishWorkout = async () => {
    if (!program || !selectedDay || isFinishing || isSubmitting || isFinishingRef.current) return;

    isFinishingRef.current = true;
    setIsFinishing(true);
    setIsSubmitting(true);

    // For non-split programs, always save as week A
    const isSplit = program.isSplit !== false;
    const effectiveWeek = isSplit ? selectedWeek : 'A';
    // Normalize exercise logs: set weight to 0 if empty when saving completed sets
    const normalizedExercises = exerciseLogs.map(exerciseLog => ({
      ...exerciseLog,
      sets: exerciseLog.sets.map(set => ({
        ...set,
        // If set is completed and weight is undefined/null, set it to 0
        weight: set.completed && (set.weight === undefined || set.weight === null) ? 0 : set.weight,
      })),
    }));

    const workoutLog = {
      programId: program.id,
      dayId: selectedDay.id,
      week: effectiveWeek,
      date: new Date().toISOString(),
      exercises: normalizedExercises,
    };

    try {
      await fetch('/api/workout-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workoutLog),
      });
      
      // Delete progress after successfully saving workout log
      try {
        await fetch(`/api/workout-progress?programId=${program.id}&dayId=${selectedDay.id}&week=${effectiveWeek}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error('Error deleting progress:', error);
        // Don't fail the workout completion if progress deletion fails
      }
      
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
      setIsFinishing(false);
      setIsSubmitting(false);
      isFinishingRef.current = false;
    }
  };

  if (!program || !selectedDay) {
    return null;
  }

  if (currentExercises.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Link href="/programs">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Programs
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
          <div className="flex justify-between items-start mb-4">
            <Link href="/programs">
              <Button variant="ghost">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Programs
              </Button>
            </Link>
            {lastSavedAt && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Saved {lastSavedAt.toLocaleTimeString()}</span>
                  </>
                )}
              </div>
            )}
          </div>
          <h1 className="text-3xl font-bold">{program.name}</h1>
          <p className="text-muted-foreground">
            {selectedDay.name}
            {program.isSplit !== false && ` • Week ${selectedWeek}`}
          </p>
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
                  {/* Mobile: Collapsible header */}
                  <div className="md:hidden mb-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowMusclesWorked(!showMusclesWorked)}
                      className="w-full justify-between mb-2"
                    >
                      <div className="flex items-center gap-2">
                        <BicepsFlexed className="h-4 w-4" />
                        <span>Muscles Worked</span>
                      </div>
                      {showMusclesWorked ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  {/* Desktop: Always visible header */}
                  <h3 className="hidden md:block font-semibold mb-3">Muscles Worked</h3>
                  
                  {/* Content: Hidden on mobile unless expanded, always visible on desktop */}
                  <div className={`${showMusclesWorked ? 'block' : 'hidden'} md:block`}>
                    <div className="flex flex-col md:flex-row items-start gap-4 2xl:gap-6">
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
                              bodyColor={bodyColor}
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
                                bodyColor={bodyColor}
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
                      <div className="flex-1 min-w-0">
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

                      {/* Exercise Images - Direct display (2xl and above) */}
                      {currentExercise.images.length > 0 && (
                        <div className="hidden 2xl:block flex-shrink-0">
                          <div className="grid grid-cols-2 gap-2">
                            {currentExercise.images.map((img, idx) => (
                              <div 
                                key={idx} 
                                className="relative w-[20rem] aspect-[850/567] rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setExpandedImage(img)}
                              >
                                <Image
                                  src={`/exercise-images/${img}`}
                                  alt={`${currentExercise.name} ${idx + 1}`}
                                  fill
                                  className="object-contain"
                                  sizes="320px"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Exercise Images - Desktop dropdown (md to 2xl) */}
                  {currentExercise.images.length > 0 && (
                    <div className="hidden md:block 2xl:hidden mt-4">
                      <Button
                        variant="outline"
                        onClick={() => setShowMobileImages(!showMobileImages)}
                        className="w-full justify-between mb-2"
                      >
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          <span>Exercise Images ({currentExercise.images.length})</span>
                        </div>
                        {showMobileImages ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      {showMobileImages && (
                        <div className="grid grid-cols-2 gap-2">
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
                                sizes="(max-width: 768px) 100vw, 50vw"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Exercise Images - Mobile only, below muscles section */}
                  {currentExercise.images.length > 0 && (
                    <div className="md:hidden mt-4">
                      <Button
                        variant="outline"
                        onClick={() => setShowMobileImages(!showMobileImages)}
                        className="w-full justify-between mb-2"
                      >
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          <span>Exercise Images ({currentExercise.images.length})</span>
                        </div>
                        {showMobileImages ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      {showMobileImages && (
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
                      )}
                    </div>
                  )}

                  {/* Instructions - Desktop: Always visible (2xl and above) */}
                  {currentExercise.instructions && currentExercise.instructions.length > 0 && (
                    <div className="hidden 2xl:block mt-4">
                      <h3 className="font-semibold mb-3">Instructions</h3>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                        {currentExercise.instructions.map((instruction, idx) => (
                          <li key={idx}>{instruction}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Instructions - Desktop dropdown (md to 2xl) */}
                  {currentExercise.instructions && currentExercise.instructions.length > 0 && (
                    <div className="hidden md:block 2xl:hidden mt-4">
                      <Button
                        variant="outline"
                        onClick={() => setShowInstructions(!showInstructions)}
                        className="w-full justify-between mb-2"
                      >
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          <span>Instructions ({currentExercise.instructions.length})</span>
                        </div>
                        {showInstructions ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      {showInstructions && (
                        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                          {currentExercise.instructions.map((instruction, idx) => (
                            <li key={idx}>{instruction}</li>
                          ))}
                        </ol>
                      )}
                    </div>
                  )}

                  {/* Instructions - Mobile dropdown */}
                  {currentExercise.instructions && currentExercise.instructions.length > 0 && (
                    <div className="md:hidden mt-4">
                      <Button
                        variant="outline"
                        onClick={() => setShowInstructions(!showInstructions)}
                        className="w-full justify-between mb-2"
                      >
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          <span>Instructions ({currentExercise.instructions.length})</span>
                        </div>
                        {showInstructions ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      {showInstructions && (
                        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                          {currentExercise.instructions.map((instruction, idx) => (
                            <li key={idx}>{instruction}</li>
                          ))}
                        </ol>
                      )}
                    </div>
                  )}

                  {/* Notes - Desktop: Always visible (2xl and above) */}
                  <div className="hidden 2xl:block mt-4">
                    <h3 className="font-semibold mb-3">My Notes</h3>
                    <Textarea
                      value={workoutNotes}
                      onChange={(e) => handleNotesChange(e.target.value)}
                      placeholder="Add your personal notes for this workout (e.g., 'Remember to put the J Cups to position 20')"
                      rows={4}
                      className="text-sm"
                    />
                  </div>

                  {/* Notes - Desktop dropdown (md to 2xl) */}
                  <div className="hidden md:block 2xl:hidden mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowNotes(!showNotes)}
                      className="w-full justify-between mb-2"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>My Notes</span>
                      </div>
                      {showNotes ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    {showNotes && (
                      <Textarea
                        value={workoutNotes}
                        onChange={(e) => handleNotesChange(e.target.value)}
                        placeholder="Add your personal notes for this workout (e.g., 'Remember to put the J Cups to position 20')"
                        rows={4}
                        className="text-sm"
                      />
                    )}
                  </div>

                  {/* Notes - Mobile dropdown */}
                  <div className="md:hidden mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowNotes(!showNotes)}
                      className="w-full justify-between mb-2"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>My Notes</span>
                      </div>
                      {showNotes ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    {showNotes && (
                      <Textarea
                        value={workoutNotes}
                        onChange={(e) => handleNotesChange(e.target.value)}
                        placeholder="Add your personal notes for this workout (e.g., 'Remember to put the J Cups to position 20')"
                        rows={4}
                        className="text-sm"
                      />
                    )}
                  </div>
                </div>

                <Separator className="my-6" />

                <div>
                  <h3 className="font-semibold text-lg mb-4">
                    {currentExercise?.category === 'cardio' ? 'Track Your Distance' : 'Track Your Sets'}
                  </h3>
                  <div className="space-y-1.5">
                    {currentLog?.sets.map((set, setIdx) => {
                      const isCardio = currentExercise?.category === 'cardio';
                      
                      return (
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
                          {isCardio ? (
                            <div className="flex-1">
                              <div className="relative">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={set.distance ?? ''}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === '' || value === '-') {
                                      updateSetLog(setIdx, { distance: undefined });
                                    } else {
                                      const numValue = parseFloat(value);
                                      if (!isNaN(numValue)) {
                                        updateSetLog(setIdx, { distance: numValue });
                                      }
                                    }
                                  }}
                                  className="h-9 pr-12 text-sm"
                                  placeholder="0"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                                  miles
                                </span>
                              </div>
                            </div>
                          ) : (
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
                              value={set.weight ?? ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '' || value === '-') {
                                  updateSetLog(setIdx, { weight: undefined });
                                } else {
                                  const numValue = parseFloat(value);
                                  if (!isNaN(numValue)) {
                                    updateSetLog(setIdx, { weight: numValue });
                                  }
                                }
                              }}
                              className="h-9 pr-8 text-sm"
                              placeholder="0"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                              lbs
                            </span>
                          </div>
                        </div>
                          )}
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
                      );
                    })}
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

        {/* Finish Workout Warning Dialog */}
        <AlertDialog open={showFinishWarning} onOpenChange={setShowFinishWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unfinished Sets Detected</AlertDialogTitle>
              <AlertDialogDescription>
                You have sets that haven't been marked as completed. Are you sure you want to finish the workout? 
                Only completed sets will be saved.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowFinishWarning(false)} disabled={isSubmitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={async () => {
                if (isSubmitting || isFinishing || isFinishingRef.current) return;
                setShowFinishWarning(false);
                await performFinishWorkout();
              }} disabled={isSubmitting}>
                {isSubmitting ? 'Finishing...' : 'Finish Anyway'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
            <Button onClick={finishWorkout} className="flex-1" disabled={isFinishing}>
              {isFinishing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finishing...
                </>
              ) : (
                'Finish Workout'
              )}
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
    <Suspense fallback={null}>
      <WorkoutContent />
    </Suspense>
  );
}




