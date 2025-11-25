'use client';

import { useState, useEffect, useMemo } from 'react';
import { WorkoutLog, ExerciseLog, Program } from '@/types/exercise';
import { useExercises } from '@/hooks/useExercises';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Button } from '@/components/ui/button';
import { Trash2, X } from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface SetData {
  reps: number;
  weight: number;
  date: string;
}

interface ExerciseStats {
  exerciseId: string;
  exerciseName: string;
  weeks: {
    weekStart: string;
    weekLabel: string;
    totalReps: number;
    avgWeight: number;
    maxWeight: number;
    sets: number;
    setDetails: SetData[];
  }[];
  allSets: SetData[];
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function formatWeekLabel(date: Date): string {
  return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

export default function AnalyticsPage() {
  const { exercises } = useExercises();
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('all');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'exercise' | 'calendar' | 'history' | 'weekProgress'>('overview');
  const [loading, setLoading] = useState(true);
  const [selectedWorkoutLog, setSelectedWorkoutLog] = useState<WorkoutLog | null>(null);

  const fetchData = () => {
    Promise.all([
      fetch('/api/workout-logs').then(res => res.json()),
      fetch('/api/programs').then(res => res.json()),
    ])
      .then(([logsData, programsData]) => {
        // Ensure both are arrays, handle error responses
        setWorkoutLogs(Array.isArray(logsData) ? logsData : []);
        setPrograms(Array.isArray(programsData) ? programsData : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching data:', err);
        setWorkoutLogs([]);
        setPrograms([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteWorkout = async (logId: string, date: string) => {
    if (!confirm(`Are you sure you want to delete the workout from ${new Date(date).toLocaleDateString()}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/workout-logs?id=${logId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete workout');
      }

      toast('Workout deleted', {
        description: 'The workout has been removed from your analytics.',
        variant: 'default'
      });

      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Error deleting workout:', error);
      toast('Failed to delete workout', {
        description: 'Please try again.',
        variant: 'destructive'
      });
    }
  };

  const filteredLogs = useMemo(() => {
    if (selectedProgramId === 'all') return workoutLogs;
    return workoutLogs.filter(log => log.programId === selectedProgramId);
  }, [workoutLogs, selectedProgramId]);

  const weeklyData = useMemo(() => {
    const weekMap = new Map<string, WorkoutLog[]>();
    
    filteredLogs.forEach(log => {
      const logDate = new Date(log.date);
      const weekStart = getWeekStart(logDate);
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, []);
      }
      weekMap.get(weekKey)!.push(log);
    });

    return Array.from(weekMap.entries())
      .map(([weekKey, logs]) => ({
        weekStart: weekKey,
        weekLabel: formatWeekLabel(new Date(weekKey)),
        logs: logs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      }))
      .sort((a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime());
  }, [filteredLogs]);

  const exerciseStats = useMemo(() => {
    const exerciseMap = new Map<string, ExerciseStats>();

    weeklyData.forEach(week => {
      week.logs.forEach(log => {
        log.exercises.forEach((exerciseLog: ExerciseLog) => {
          const exercise = exercises.find(ex => ex.id === exerciseLog.exerciseId);
          const exerciseName = exercise?.name || exerciseLog.exerciseId;

          if (!exerciseMap.has(exerciseLog.exerciseId)) {
            exerciseMap.set(exerciseLog.exerciseId, {
              exerciseId: exerciseLog.exerciseId,
              exerciseName,
              weeks: [],
              allSets: [],
            });
          }

          const stats = exerciseMap.get(exerciseLog.exerciseId)!;
          
          let weekStats = stats.weeks.find(w => w.weekStart === week.weekStart);
          
          if (!weekStats) {
            weekStats = {
              weekStart: week.weekStart,
              weekLabel: week.weekLabel,
              totalReps: 0,
              avgWeight: 0,
              maxWeight: 0,
              sets: 0,
              setDetails: [],
            };
            stats.weeks.push(weekStats);
          }

          exerciseLog.sets.forEach(set => {
            if (set.completed) {
              if (set.reps !== undefined && set.weight !== undefined) {
                weekStats.sets += 1;
                weekStats.totalReps += set.reps;
                const setData: SetData = {
                  reps: set.reps,
                  weight: set.weight,
                  date: log.date
                };
                weekStats.setDetails.push(setData);
                stats.allSets.push(setData);
                
                if (set.weight > weekStats.maxWeight) {
                  weekStats.maxWeight = set.weight;
                }
              } else if (set.repWeights && Array.isArray(set.repWeights)) {
                weekStats.sets += 1;
                weekStats.totalReps += set.repWeights.length;
                const avgWeight = set.repWeights.reduce((a, b) => a + b, 0) / set.repWeights.length;
                const setData: SetData = {
                  reps: set.repWeights.length,
                  weight: avgWeight,
                  date: log.date
                };
                weekStats.setDetails.push(setData);
                stats.allSets.push(setData);
                
                const maxWeight = Math.max(...set.repWeights);
                if (maxWeight > weekStats.maxWeight) {
                  weekStats.maxWeight = maxWeight;
                }
              }
            }
          });

          if (weekStats.setDetails.length > 0) {
            const totalWeight = weekStats.setDetails.reduce((sum, s) => sum + s.weight, 0);
            weekStats.avgWeight = totalWeight / weekStats.setDetails.length;
          }
        });
      });
    });

    return Array.from(exerciseMap.values()).sort((a, b) => 
      a.exerciseName.localeCompare(b.exerciseName)
    );
  }, [weeklyData, exercises]);

  const programOptions = useMemo(() => {
    const programMap = new Map<string, Program>();
    programs.forEach(p => programMap.set(p.id, p));
    
    const ids = new Set(workoutLogs.map(log => log.programId));
    return Array.from(ids).map(id => ({
      id,
      name: programMap.get(id)?.name || `Program ${id.slice(-6)}`,
    }));
  }, [workoutLogs, programs]);

  // Chart data for selected exercise
  const chartData = useMemo(() => {
    if (!selectedExerciseId) return [];
    const exercise = exerciseStats.find(e => e.exerciseId === selectedExerciseId);
    if (!exercise) return [];
    
    return exercise.allSets
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((set, idx) => ({
        date: new Date(set.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        weight: set.weight,
        reps: set.reps,
        setNumber: idx + 1,
      }));
  }, [selectedExerciseId, exerciseStats]);

  // Calendar data
  const calendarData = useMemo(() => {
    const calendarMap = new Map<string, { 
      date: string; 
      workouts: number; 
      exercises: number;
      workoutDetails: Array<{ programName: string; dayName: string; week?: string }>;
    }>();
    
    filteredLogs.forEach(log => {
      const dateKey = new Date(log.date).toISOString().split('T')[0];
      if (!calendarMap.has(dateKey)) {
        calendarMap.set(dateKey, { 
          date: dateKey, 
          workouts: 0, 
          exercises: 0,
          workoutDetails: []
        });
      }
      const day = calendarMap.get(dateKey)!;
      day.workouts += 1;
      day.exercises += log.exercises.length;
      
      // Get program and day name
      const program = programs.find(p => p.id === log.programId);
      const programName = program?.name || `Program ${log.programId.slice(-6)}`;
      const workoutDay = program?.days.find(d => d.id === log.dayId);
      const dayName = workoutDay?.name || `Day ${log.dayId.slice(-6)}`;
      const isSplit = program?.isSplit !== false; // Default to true for backward compatibility
      
      day.workoutDetails.push({ 
        programName, 
        dayName,
        week: isSplit ? log.week : undefined
      });
    });
    
    return Array.from(calendarMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [filteredLogs, programs]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-2xl">Loading analytics...</div>
      </div>
    );
  }

  if (exerciseStats.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <h1 className="text-3xl font-bold mb-6">Analytics</h1>
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground text-lg">No workout data available yet. Complete some workouts to see your progress!</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const selectedExercise = selectedExerciseId 
    ? exerciseStats.find(e => e.exerciseId === selectedExerciseId)
    : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Analytics</h1>
          {programOptions.length > 0 && (
            <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filter by program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {programOptions.map(option => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="mb-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="exercise">Exercise Details</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="weekProgress">Week Progress</TabsTrigger>
            <TabsTrigger value="history">Workout History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Workouts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{filteredLogs.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Exercises</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{exerciseStats.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Sets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {exerciseStats.reduce((sum, e) => sum + e.allSets.length, 0)}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>All Exercises</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {exerciseStats.map(exercise => (
                    <div key={exercise.exerciseId} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer" onClick={() => { setSelectedExerciseId(exercise.exerciseId); setViewMode('exercise'); }}>
                      <div>
                        <div className="font-semibold">{exercise.exerciseName}</div>
                        <div className="text-sm text-muted-foreground">
                          {exercise.allSets.length} sets • {exercise.weeks.length} week{exercise.weeks.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {exercise.allSets.length > 0 
                            ? Math.max(...exercise.allSets.map(s => s.weight)).toFixed(1)
                            : '0'} lbs
                        </div>
                        <div className="text-sm text-muted-foreground">Max Weight</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exercise" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Select Exercise</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedExerciseId || ''} onValueChange={setSelectedExerciseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an exercise" />
                  </SelectTrigger>
                  <SelectContent>
                    {exerciseStats.map(exercise => (
                      <SelectItem key={exercise.exerciseId} value={exercise.exerciseId}>
                        {exercise.exerciseName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {selectedExercise && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedExercise.exerciseName}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {chartData.length > 0 && (
                        <>
                          <div>
                            <h3 className="font-semibold mb-4">Weight Progression</h3>
                            <ResponsiveContainer width="100%" height={300}>
                              <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} name="Weight (lbs)" />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                          <div>
                            <h3 className="font-semibold mb-4">Reps Progression</h3>
                            <ResponsiveContainer width="100%" height={300}>
                              <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="reps" fill="hsl(var(--secondary))" name="Reps" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Weekly Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedExercise.weeks.map((week, weekIdx) => (
                        <div key={week.weekStart}>
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h3 className="font-semibold text-lg">{week.weekLabel}</h3>
                              <div className="flex gap-4 mt-1">
                                <Badge variant="secondary">
                                  {week.totalReps} rep{week.totalReps !== 1 ? 's' : ''}
                                </Badge>
                                <Badge variant="secondary">
                                  {week.sets} set{week.sets !== 1 ? 's' : ''}
                                </Badge>
                                <Badge variant="secondary">
                                  Avg: {week.avgWeight.toFixed(1)} lbs
                                </Badge>
                                <Badge variant="secondary">
                                  Max: {week.maxWeight.toFixed(1)} lbs
                                </Badge>
                              </div>
                            </div>
                            {weekIdx > 0 && (
                              <div className="text-right">
                                <div className="text-sm text-muted-foreground">vs Previous Week</div>
                                <div className="flex gap-2 mt-1">
                                  {week.totalReps > selectedExercise.weeks[weekIdx - 1].totalReps && (
                                    <Badge variant="default" className="bg-green-600">↑ Reps</Badge>
                                  )}
                                  {week.avgWeight > selectedExercise.weeks[weekIdx - 1].avgWeight && (
                                    <Badge variant="default" className="bg-green-600">↑ Weight</Badge>
                                  )}
                                  {week.maxWeight > selectedExercise.weeks[weekIdx - 1].maxWeight && (
                                    <Badge variant="default" className="bg-green-600">↑ Max</Badge>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-3">
                            <div className="text-sm text-muted-foreground mb-2">Sets:</div>
                            <div className="flex flex-wrap gap-2">
                              {week.setDetails.map((set, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  Set {idx + 1}: {set.reps} reps × {set.weight} lbs
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {weekIdx < selectedExercise.weeks.length - 1 && <Separator className="my-4" />}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Workout Calendar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {calendarData.map(day => {
                    const date = new Date(day.date);
                    const dayOfWeek = date.getDay();
                    const dayOfMonth = date.getDate();
                    const tooltipText = day.workouts > 0
                      ? `${date.toLocaleDateString()}: ${day.workoutDetails.map(w => {
                          const weekText = w.week ? ` Week ${w.week}` : '';
                          return `${w.programName} - ${w.dayName}${weekText}`;
                        }).join(', ')}`
                      : date.toLocaleDateString();
                    const firstWorkout = day.workoutDetails[0];
                    return (
                      <div
                        key={day.date}
                        className={`aspect-square p-2 rounded-lg border flex flex-col ${
                          day.workouts > 0 
                            ? 'bg-primary/10 border-primary/30' 
                            : 'bg-muted/30 border-border'
                        }`}
                        title={tooltipText}
                      >
                        <div className="text-xs font-medium mb-1">{dayOfMonth}</div>
                        {day.workouts > 0 && firstWorkout && (
                          <div className="text-xs text-primary flex-1 flex flex-col justify-start overflow-hidden">
                            <div className="font-semibold truncate leading-tight" title={firstWorkout.programName}>
                              {firstWorkout.programName}
                            </div>
                            <div className="text-[10px] opacity-80 truncate leading-tight mt-0.5" title={firstWorkout.dayName}>
                              {firstWorkout.dayName}
                              {firstWorkout.week && (
                                <span className="ml-1 font-semibold">({firstWorkout.week})</span>
                              )}
                            </div>
                            {day.workouts > 1 && (
                              <div className="text-[10px] opacity-60 mt-0.5">
                                +{day.workouts - 1} more
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Workout History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredLogs
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(log => {
                      const program = programs.find(p => p.id === log.programId);
                      const programName = program?.name || `Program ${log.programId.slice(-6)}`;
                      const date = new Date(log.date);
                      
                      return (
                        <div 
                          key={log.id} 
                          className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => setSelectedWorkoutLog(log)}
                        >
                          <div className="flex-1">
                            <div className="font-semibold">
                              {date.toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {programName} • {log.exercises.length} exercise{log.exercises.length !== 1 ? 's' : ''} • Week {log.week}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteWorkout(log.id!, log.date);
                              }}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  {filteredLogs.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No workout history found
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="weekProgress" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Week-by-Week Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left p-3 border-b sticky left-0 bg-background z-10 min-w-[200px]">Week</th>
                        {exerciseStats.map(exercise => (
                          <th key={exercise.exerciseId} className="text-left p-3 border-b min-w-[180px]">
                            <div className="font-semibold">{exercise.exerciseName}</div>
                            <div className="text-xs text-muted-foreground font-normal">Sets × Reps × Weight</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyData.map(week => (
                        <tr key={week.weekStart} className="hover:bg-muted/50">
                          <td className="p-3 border-b sticky left-0 bg-background z-10 font-medium">
                            {week.weekLabel}
                          </td>
                          {exerciseStats.map(exercise => {
                            const weekStats = exercise.weeks.find(w => w.weekStart === week.weekStart);
                            if (!weekStats || weekStats.setDetails.length === 0) {
                              return (
                                <td key={exercise.exerciseId} className="p-3 border-b text-muted-foreground text-sm">
                                  —
                                </td>
                              );
                            }
                            return (
                              <td key={exercise.exerciseId} className="p-3 border-b">
                                <div className="space-y-1">
                                  {weekStats.setDetails.map((set, idx) => (
                                    <div key={idx} className="text-sm">
                                      <Badge variant="outline" className="text-xs">
                                        {set.reps}×{set.weight}lbs
                                      </Badge>
                                    </div>
                                  ))}
                                  <div className="text-xs text-muted-foreground mt-2">
                                    {weekStats.sets} sets • Avg: {weekStats.avgWeight.toFixed(1)}lbs • Max: {weekStats.maxWeight.toFixed(1)}lbs
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Workout Detail Dialog */}
        <Dialog open={!!selectedWorkoutLog} onOpenChange={(open) => !open && setSelectedWorkoutLog(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {selectedWorkoutLog && (() => {
              const program = programs.find(p => p.id === selectedWorkoutLog.programId);
              const programName = program?.name || `Program ${selectedWorkoutLog.programId.slice(-6)}`;
              const date = new Date(selectedWorkoutLog.date);
              
              return (
                <>
                  <DialogHeader>
                    <DialogTitle>
                      {date.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="secondary">{programName}</Badge>
                      <Badge variant="secondary">Week {selectedWorkoutLog.week}</Badge>
                      <Badge variant="secondary">
                        {selectedWorkoutLog.exercises.length} exercise{selectedWorkoutLog.exercises.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    
                    <div className="space-y-4">
                      {selectedWorkoutLog.exercises.map((exerciseLog, idx) => {
                        const exercise = exercises.find(ex => ex.id === exerciseLog.exerciseId);
                        const exerciseName = exercise?.name || exerciseLog.exerciseId;
                        const completedSets = exerciseLog.sets.filter(s => s.completed);
                        
                        return (
                          <Card key={idx}>
                            <CardHeader>
                              <CardTitle className="text-lg">{exerciseName}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                {completedSets.length > 0 ? (
                                  completedSets.map((set, setIdx) => (
                                    <div key={setIdx} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                                      <Badge variant="outline" className="w-12 justify-center">
                                        {setIdx + 1}
                                      </Badge>
                                      <div className="flex-1 grid grid-cols-2 gap-4">
                                        <div>
                                          <div className="text-xs text-muted-foreground">Reps</div>
                                          <div className="font-semibold">
                                            {set.reps ?? (set.repWeights?.length ?? 0)}
                                          </div>
                                        </div>
                                        <div>
                                          <div className="text-xs text-muted-foreground">Weight</div>
                                          <div className="font-semibold">
                                            {set.weight ?? (set.repWeights ? (set.repWeights.reduce((a, b) => a + b, 0) / set.repWeights.length).toFixed(1) : 0)} lbs
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-sm text-muted-foreground py-2">
                                    No completed sets
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
