'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Program, WorkoutDay } from '@/types/exercise';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Play, Settings, Eye } from 'lucide-react';
import { useLoading } from '@/components/LoadingProvider';
import { useExercises } from '@/hooks/useExercises';

type WeekMapping = 'oddA' | 'oddB';

// Get ISO week number of the year (1-53)
function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Get current week letter based on week number and mapping preference
function getCurrentWeekLetter(mapping: WeekMapping = 'oddA'): 'A' | 'B' {
  const weekNumber = getISOWeekNumber(new Date());
  const isOdd = weekNumber % 2 === 1;
  
  if (mapping === 'oddA') {
    return isOdd ? 'A' : 'B';
  } else {
    return isOdd ? 'B' : 'A';
  }
}

// Get current week number
function getCurrentWeekNumber(): number {
  return getISOWeekNumber(new Date());
}

export default function ProgramsTab() {
  const router = useRouter();
  const { startLoading, stopLoading } = useLoading();
  const { exercises } = useExercises();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [currentWeekNumber, setCurrentWeekNumber] = useState<number>(getCurrentWeekNumber());
  const [weekMapping, setWeekMapping] = useState<WeekMapping>('oddA');
  const [selectedWeek, setSelectedWeek] = useState<'A' | 'B'>(getCurrentWeekLetter('oddA'));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inProgressWorkouts, setInProgressWorkouts] = useState<Map<string, { week: string; updatedAt: string }>>(new Map());
  const [selectedDayBreakdown, setSelectedDayBreakdown] = useState<{ program: Program; day: WorkoutDay } | null>(null);

  useEffect(() => {
    fetchPrograms();
    fetchWeekMapping();
    fetchInProgressWorkouts();
    // Update week number and selected week when component mounts or date changes
    const updateWeek = () => {
      const weekNum = getCurrentWeekNumber();
      const weekLetter = getCurrentWeekLetter(weekMapping);
      setCurrentWeekNumber(weekNum);
      setSelectedWeek(weekLetter);
    };
    updateWeek();
  }, [weekMapping]);

  const fetchInProgressWorkouts = async () => {
    try {
      const res = await fetch('/api/workout-progress/all');
      if (res.ok) {
        const data = await res.json();
        const progressMap = new Map<string, { week: string; updatedAt: string }>();
        data.progress.forEach((p: { programId: string; dayId: string; week: string; updatedAt: string }) => {
          const key = `${p.programId}-${p.dayId}`;
          progressMap.set(key, { week: p.week, updatedAt: p.updatedAt });
        });
        setInProgressWorkouts(progressMap);
      }
    } catch (error) {
      console.error('Error fetching in-progress workouts:', error);
    }
  };

  const fetchWeekMapping = async () => {
    try {
      const res = await fetch('/api/user-settings/week-mapping');
      if (res.ok) {
        const data = await res.json();
        if (data.weekMapping === 'oddA' || data.weekMapping === 'oddB') {
          setWeekMapping(data.weekMapping);
          const weekLetter = getCurrentWeekLetter(data.weekMapping);
          setSelectedWeek(weekLetter);
        }
      }
    } catch (error) {
      console.error('Error fetching week mapping:', error);
    }
  };

  const handleMappingChange = async (mapping: WeekMapping) => {
    try {
      const res = await fetch('/api/user-settings/week-mapping', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ weekMapping: mapping }),
      });

      if (res.ok) {
        setWeekMapping(mapping);
        const weekLetter = getCurrentWeekLetter(mapping);
        setSelectedWeek(weekLetter);
        setSettingsOpen(false);
      } else {
        console.error('Error updating week mapping:', await res.text());
      }
    } catch (error) {
      console.error('Error updating week mapping:', error);
    }
  };

  const fetchPrograms = async () => {
    try {
      startLoading();
      const res = await fetch('/api/programs');
      const data = await res.json();
      // Ensure data is an array, handle error responses
      if (Array.isArray(data)) {
        setPrograms(data);
      } else if (data.error) {
        console.error('Error fetching programs:', data.error);
        setPrograms([]); // Set empty array on error
      } else {
        console.error('Unexpected response format:', data);
        setPrograms([]);
      }
    } catch (error) {
      console.error('Error fetching programs:', error);
      setPrograms([]); // Set empty array on error
    } finally {
      stopLoading();
    }
  };

  const handleDelete = async (programId: string) => {
    if (confirm('Are you sure you want to delete this program?')) {
      try {
        await fetch(`/api/programs/${programId}`, { method: 'DELETE' });
        setPrograms(programs.filter(p => p.id !== programId));
        // Refresh in-progress workouts after deletion
        fetchInProgressWorkouts();
      } catch (error) {
        console.error('Error deleting program:', error);
      }
    }
  };


  const isDayInProgress = (programId: string, dayId: string, week: string): boolean => {
    const key = `${programId}-${dayId}`;
    const progress = inProgressWorkouts.get(key);
    return progress !== undefined && progress.week === week;
  };

  const getExercise = (exerciseId: string) => {
    return exercises.find(ex => ex.id === exerciseId);
  };


  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold">My Programs</h2>
          <p className="text-muted-foreground">{programs.length} program(s) created</p>
        </div>
        <div className="flex items-center gap-4">
          {programs.some(p => p.isSplit === true) && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Week {currentWeekNumber} {selectedWeek}:
              </span>
              <Tabs value={selectedWeek} onValueChange={(value) => setSelectedWeek(value as 'A' | 'B')}>
                <TabsList>
                  <TabsTrigger value="A">A</TabsTrigger>
                  <TabsTrigger value="B">B</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          )}
          <Link href="/programs/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Program
            </Button>
          </Link>
        </div>
      </div>

      {programs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground text-lg mb-4">No programs created yet</p>
            <Link href="/programs/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Program
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map(program => (
            <Card 
              key={program.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push(`/programs/${program.id}`)}
            >
              <CardHeader className="relative">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle>{program.name}</CardTitle>
                    <CardDescription>{program.days.length} day(s)</CardDescription>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Link href={`/programs/${program.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/programs/${program.id}/edit`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(program.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {program.days.map(day => (
                    <div 
                      key={day.id} 
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDayBreakdown({ program, day });
                      }}
                    >
                      <div className="flex-1">
                        <div className="font-semibold text-sm">{day.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {program.isSplit !== false ? (
                            <span className="flex items-center gap-1.5">
                              <span className={selectedWeek === 'A' ? 'font-semibold text-primary' : ''}>
                                Week A: {day.weekA.length}
                                {selectedWeek === 'A' && <span className="ml-1">●</span>}
                              </span>
                              <span>•</span>
                              <span className={selectedWeek === 'B' ? 'font-semibold text-primary' : ''}>
                                Week B: {day.weekB.length}
                                {selectedWeek === 'B' && <span className="ml-1">●</span>}
                              </span>
                            </span>
                          ) : (
                            `${day.weekA.length} exercise${day.weekA.length !== 1 ? 's' : ''}`
                          )}
                        </div>
                      </div>
                      <Link href={`/workout?programId=${program.id}&dayId=${day.id}&week=${program.isSplit !== false ? selectedWeek : 'A'}`} onClick={(e) => e.stopPropagation()}>
                        {isDayInProgress(program.id, day.id, program.isSplit !== false ? selectedWeek : 'A') ? (
                          <Button size="sm" variant="secondary">
                            <Play className="mr-2 h-4 w-4" />
                            Resume
                          </Button>
                        ) : (
                          <Button size="sm">
                            <Play className="mr-2 h-4 w-4" />
                            Start
                          </Button>
                        )}
                      </Link>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Week Mapping</DialogTitle>
            <DialogDescription>
              Configure how week numbers map to Week A and Week B
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <button
              onClick={() => handleMappingChange('oddA')}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                weekMapping === 'oddA'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-accent/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="font-medium">Odd weeks → Week A</span>
                  <span className="text-sm text-muted-foreground">Even weeks → Week B</span>
                </div>
                {weekMapping === 'oddA' && (
                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                  </div>
                )}
                {weekMapping !== 'oddA' && (
                  <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                )}
              </div>
            </button>
            <button
              onClick={() => handleMappingChange('oddB')}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                weekMapping === 'oddB'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-accent/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="font-medium">Odd weeks → Week B</span>
                  <span className="text-sm text-muted-foreground">Even weeks → Week A</span>
                </div>
                {weekMapping === 'oddB' && (
                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                  </div>
                )}
                {weekMapping !== 'oddB' && (
                  <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                )}
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Day Breakdown Modal */}
      <Dialog open={!!selectedDayBreakdown} onOpenChange={(open) => !open && setSelectedDayBreakdown(null)}>
        <DialogContent className="sm:max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-2xl">{selectedDayBreakdown?.day.name}</DialogTitle>
            <DialogDescription className="text-base">
              From program: <span className="font-semibold text-foreground">{selectedDayBreakdown?.program.name}</span>
            </DialogDescription>
          </DialogHeader>
          {selectedDayBreakdown && (() => {
            const { program, day } = selectedDayBreakdown;
            const isSplit = program.isSplit !== false;
            return (
              <div className={`grid gap-6 ${isSplit ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
                {(['A', 'B'] as const).filter(week => isSplit || week === 'A').map(week => (
                  <div key={week} className="space-y-4">
                    {isSplit && (
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <h3 className="text-lg font-semibold">Week {week}</h3>
                        <span className="text-sm text-muted-foreground">
                          ({day[week === 'A' ? 'weekA' : 'weekB'].length} {day[week === 'A' ? 'weekA' : 'weekB'].length === 1 ? 'exercise' : 'exercises'})
                        </span>
                      </div>
                    )}

                    <div className="space-y-3">
                      {day[week === 'A' ? 'weekA' : 'weekB'].map((programExercise, idx) => {
                        const exercise = getExercise(programExercise.exerciseId);
                        if (!exercise) return null;

                        return (
                          <div key={idx} className="group bg-card border rounded-lg p-4 hover:border-primary/50 transition-colors">
                            <div className="flex gap-4">
                              {exercise.images[0] && (
                                <div className="relative w-24 h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0 border">
                                  <Image
                                    src={`/exercise-images/${exercise.images[0]}`}
                                    alt={exercise.name}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-base mb-2 leading-tight">{exercise.name}</h4>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-2">
                                  {exercise.category === 'cardio' ? (
                                    programExercise.distance !== undefined && (
                                      <span className="font-medium">{Number(programExercise.distance).toFixed(2).replace(/\.?0+$/, '')} miles</span>
                                    )
                                  ) : (
                                    <>
                                      {programExercise.sets && (
                                        <span className="font-medium">{programExercise.sets} {programExercise.sets === 1 ? 'set' : 'sets'}</span>
                                      )}
                                      {programExercise.reps && (
                                        <span>× {programExercise.reps} {programExercise.reps === 1 ? 'rep' : 'reps'}</span>
                                      )}
                                      {programExercise.weight && (
                                        <span>@ {programExercise.weight} lbs</span>
                                      )}
                                    </>
                                  )}
                                </div>
                                {programExercise.notes && (
                                  <div className="text-sm text-muted-foreground mt-2 italic border-l-2 border-primary/30 pl-2">
                                    {programExercise.notes}
                                  </div>
                                )}
                                {exercise.primaryMuscles.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-3">
                                    {exercise.primaryMuscles.map(muscle => (
                                      <span key={muscle} className="px-2.5 py-1 bg-secondary/50 text-secondary-foreground text-xs rounded-md font-medium">
                                        {muscle}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {day[week === 'A' ? 'weekA' : 'weekB'].length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>No exercises for this week</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
