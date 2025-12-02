'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Program, WorkoutDay, ProgramExercise } from '@/types/exercise';
import { useExercises } from '@/hooks/useExercises';
import ExerciseSelector from '@/components/ExerciseSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Save, Hourglass } from 'lucide-react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import DayTabs from './DayTabs';
import { ProgramFormProps } from './types';

export default function ProgramForm({
  initialProgram,
  onSave,
  cancelUrl,
  title,
  saveButtonText = 'Save Program'
}: ProgramFormProps) {
  const { exercises, refetch: refetchExercises } = useExercises();
  const [programName, setProgramName] = useState(initialProgram?.name || '');
  const [days, setDays] = useState<WorkoutDay[]>(initialProgram?.days || []);
  const [isSplit, setIsSplit] = useState(initialProgram?.isSplit !== false); // Default to true for backward compatibility
  // Default to undefined (unlimited) if not set or null
  const [durationWeeks, setDurationWeeks] = useState<number | undefined>(
    initialProgram?.durationWeeks !== null && initialProgram?.durationWeeks !== undefined 
      ? initialProgram.durationWeeks 
      : undefined
  );
  const [activeTab, setActiveTab] = useState<string>('');
  const [newDayName, setNewDayName] = useState('');
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editingWeek, setEditingWeek] = useState<'A' | 'B' | null>(null);
  const [dayToDelete, setDayToDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isEditing = !!initialProgram?.id;

  useEffect(() => {
    if (days.length > 0 && (!activeTab || (!days.find(d => d.id === activeTab) && activeTab !== 'add-day'))) {
      setActiveTab(days[0].id);
    } else if (days.length === 0 && activeTab !== 'add-day') {
      setActiveTab('');
    }
  }, [days, activeTab]);

  // Sync durationWeeks when initialProgram changes (for async loading)
  useEffect(() => {
    if (initialProgram) {
      // Always default to undefined (unlimited) if durationWeeks is null, undefined, 0, or invalid
      const duration = initialProgram.durationWeeks;
      const newDurationWeeks = (duration !== null && 
                               duration !== undefined && 
                               typeof duration === 'number' &&
                               duration > 0)
        ? duration 
        : undefined;
      
      setDurationWeeks(newDurationWeeks);
    } else {
      // If no initial program, default to unlimited
      setDurationWeeks(undefined);
    }
  }, [initialProgram]);

  // Auto-save function (only for editing existing programs)
  const performAutoSave = useCallback(async () => {
    if (!isEditing || !initialProgram?.id || !programName.trim() || days.length === 0) {
      return;
    }

    setAutoSaving(true);
    try {
      await onSave({ name: programName, days, isSplit, durationWeeks });
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error auto-saving program:', error);
      // Don't show toast for auto-save failures to avoid annoying the user
    } finally {
      setAutoSaving(false);
    }
  }, [isEditing, initialProgram?.id, programName, days, isSplit, durationWeeks, onSave]);

  // Debounced auto-save effect
  useEffect(() => {
    if (!isEditing) return;

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save (500ms after last change for faster response)
    autoSaveTimeoutRef.current = setTimeout(() => {
      performAutoSave();
    }, 500);

    // Cleanup on unmount
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [programName, days, isSplit, durationWeeks, isEditing, performAutoSave]);

  const addDay = (name?: string) => {
    const dayName = name || newDayName;
    if (!dayName.trim()) return;

    const newDay: WorkoutDay = {
      id: Date.now().toString(),
      name: dayName.trim(),
      weekA: [],
      weekB: [],
    };

    setDays([...days, newDay]);
    setActiveTab(newDay.id);
    setNewDayName('');
  };

  const handleDeleteClick = (dayId: string) => {
    if (days.length > 1) {
      setDayToDelete(dayId);
    } else {
      toast('Cannot remove the last day', { variant: 'destructive' });
    }
  };

  const handleUpdateDayName = (dayId: string, newName: string) => {
    if (!newName.trim()) return;
    
    setDays(days.map(day => 
      day.id === dayId ? { ...day, name: newName.trim() } : day
    ));
  };

  const confirmDeleteDay = () => {
    if (!dayToDelete) return;
    
    const newDays = days.filter(d => d.id !== dayToDelete);
    setDays(newDays);
    setDayToDelete(null);
    
    if (activeTab === dayToDelete && newDays.length > 0) {
      setActiveTab(newDays[0].id);
    }
  };

  const addExerciseToDay = (dayId: string, week: 'A' | 'B', exerciseId: string) => {
    setDays(days.map(day => {
      if (day.id !== dayId) return day;

      const weekKey = week === 'A' ? 'weekA' : 'weekB';
      const currentExercises = day[weekKey];
      const maxOrder = currentExercises.length > 0 
        ? Math.max(...currentExercises.map(ex => ex.order ?? 0))
        : -1;

      const newExercise: ProgramExercise = {
        exerciseId,
        sets: 3,
        reps: 10,
        order: maxOrder + 1,
      };

      return {
        ...day,
        [weekKey]: [...currentExercises, newExercise],
      };
    }));
  };

  const removeExercise = (dayId: string, week: 'A' | 'B', exerciseIndex: number) => {
    setDays(days.map(day => {
      if (day.id !== dayId) return day;

      const weekKey = week === 'A' ? 'weekA' : 'weekB';
      const filtered = day[weekKey].filter((_, idx) => idx !== exerciseIndex);
      return {
        ...day,
        [weekKey]: filtered.map((ex, idx) => ({ ...ex, order: idx })),
      };
    }));
  };

  const updateExercise = (
    dayId: string,
    week: 'A' | 'B',
    exerciseIndex: number,
    updates: Partial<ProgramExercise>
  ) => {
    setDays(days.map(day => {
      if (day.id !== dayId) return day;

      const weekKey = week === 'A' ? 'weekA' : 'weekB';
      return {
        ...day,
        [weekKey]: day[weekKey].map((ex, idx) =>
          idx === exerciseIndex ? { ...ex, ...updates } : ex
        ),
      };
    }));
  };

  const getExerciseName = (exerciseId: string) => {
    return exercises.find(ex => ex.id === exerciseId)?.name || 'Unknown Exercise';
  };

  const getExerciseCategory = (exerciseId: string) => {
    return exercises.find(ex => ex.id === exerciseId)?.category;
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Parse draggableId format: "dayId-week-index"
    const [dayId, week] = draggableId.split('-').slice(0, 2);
    const sourceIndex = source.index;
    
    // Parse destination droppableId format: "dayId-week" or "empty-dayId-week"
    let destDayId: string;
    let destWeek: 'A' | 'B';
    
    if (destination.droppableId.startsWith('empty-')) {
      const [, emptyDayId, emptyWeek] = destination.droppableId.split('-');
      destDayId = emptyDayId;
      destWeek = emptyWeek as 'A' | 'B';
    } else {
      [destDayId, destWeek] = destination.droppableId.split('-') as [string, 'A' | 'B'];
    }

    const destIndex = destination.index;

    setDays(prevDays => {
      const newDays = prevDays.map(day => {
        if (day.id === dayId && day.id === destDayId) {
          // Same day
          const sourceWeekKey = week === 'A' ? 'weekA' : 'weekB';
          const destWeekKey = destWeek === 'A' ? 'weekA' : 'weekB';
          
          if (sourceWeekKey === destWeekKey) {
            // Same week, reorder
            const items = [...day[sourceWeekKey]];
            const [removed] = items.splice(sourceIndex, 1);
            items.splice(destIndex, 0, removed);
            return {
              ...day,
              [sourceWeekKey]: items.map((ex, idx) => ({ ...ex, order: idx })),
            };
          } else {
            // Different week, move between weeks
            const sourceItems = [...day[sourceWeekKey]];
            const destItems = [...day[destWeekKey]];
            const [moved] = sourceItems.splice(sourceIndex, 1);
            destItems.splice(destIndex, 0, moved);
            return {
              ...day,
              [sourceWeekKey]: sourceItems.map((ex, idx) => ({ ...ex, order: idx })),
              [destWeekKey]: destItems.map((ex, idx) => ({ ...ex, order: idx })),
            };
          }
        } else if (day.id === dayId) {
          // Remove from source day
          const weekKey = week === 'A' ? 'weekA' : 'weekB';
          const items = day[weekKey].filter((_, idx) => idx !== sourceIndex);
          return {
            ...day,
            [weekKey]: items.map((ex, idx) => ({ ...ex, order: idx })),
          };
        } else if (day.id === destDayId) {
          // Add to target day
          const sourceDay = prevDays.find(d => d.id === dayId);
          if (!sourceDay) return day;
          const sourceWeekKey = week === 'A' ? 'weekA' : 'weekB';
          const destWeekKey = destWeek === 'A' ? 'weekA' : 'weekB';
          const items = [...day[destWeekKey]];
          const exerciseToMove = sourceDay[sourceWeekKey][sourceIndex];
          items.splice(destIndex, 0, exerciseToMove);
          return {
            ...day,
            [destWeekKey]: items.map((ex, idx) => ({ ...ex, order: idx })),
          };
        }
        return day;
      });
      return newDays;
    });
  };

  const handleSave = async () => {
    if (!programName.trim()) {
      toast('Please enter a program name', { variant: 'destructive' });
      return;
    }

    if (days.length === 0) {
      toast('Please add at least one day to your program', { variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await onSave({ name: programName, days, isSplit, durationWeeks });
      toast('Program saved successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error saving program:', error);
      toast('Failed to save program', { variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href={cancelUrl}>
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold">{title}</h1>
            {isEditing && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                {autoSaving ? (
                  <span className="flex items-center gap-1">
                    <Hourglass className="h-4 w-4 animate-spin" />
                    Saving...
                  </span>
                ) : lastSaved ? (
                  <span>Saved {lastSaved.toLocaleTimeString()}</span>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Program Name</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="text"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              placeholder="e.g., Upper/Lower Split, PPL Program"
              className="text-lg"
            />
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Program Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isSplit"
                checked={isSplit}
                onChange={(e) => setIsSplit(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="isSplit" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Split Program (Alternate between Week A and Week B)
              </label>
            </div>
            <p className="text-sm text-muted-foreground">
              {isSplit 
                ? 'This program alternates between two different workout weeks (A and B).'
                : 'This program uses the same exercises every week (no alternation).'}
            </p>
            
            <div className="space-y-2">
              <label htmlFor="duration" className="text-sm font-medium">
                Program Duration <span className="text-muted-foreground">(required)</span>
              </label>
              <Select
                value={
                  durationWeeks === undefined || 
                  durationWeeks === null || 
                  !durationWeeks || 
                  durationWeeks <= 0
                    ? 'unlimited' 
                    : durationWeeks.toString()
                }
                onValueChange={(value) => {
                  setDurationWeeks(value === 'unlimited' ? undefined : parseInt(value, 10));
                }}
                defaultValue="unlimited"
              >
                <SelectTrigger id="duration" className="w-full">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unlimited">Unlimited</SelectItem>
                  <SelectItem value="4">4 weeks</SelectItem>
                  <SelectItem value="6">6 weeks</SelectItem>
                  <SelectItem value="8">8 weeks</SelectItem>
                  <SelectItem value="12">12 weeks</SelectItem>
                  <SelectItem value="16">16 weeks</SelectItem>
                  <SelectItem value="20">20 weeks</SelectItem>
                  <SelectItem value="24">24 weeks</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {durationWeeks === undefined || 
                 durationWeeks === null || 
                 !durationWeeks || 
                 durationWeeks <= 0
                  ? 'This program has no set duration and can be used indefinitely.'
                  : `This program is designed to last ${durationWeeks} weeks.`}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mb-4">
          <h2 className="text-2xl font-bold">Workout Days</h2>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <DayTabs
            days={days}
            activeTab={activeTab || (days.length === 0 ? 'add-day' : '')}
            onTabChange={(value) => {
              setActiveTab(value);
              if (value !== 'add-day') {
                setNewDayName('');
              }
            }}
            onDeleteClick={handleDeleteClick}
            getExerciseName={getExerciseName}
            getExerciseCategory={getExerciseCategory}
            updateExercise={updateExercise}
            removeExercise={removeExercise}
            onAddExercise={(dayId, week) => {
              setEditingDay(dayId);
              setEditingWeek(week);
            }}
            onAddDay={(name) => {
              setNewDayName(name);
              addDay();
            }}
            onUpdateDayName={handleUpdateDayName}
            newDayName={newDayName}
            onNewDayNameChange={setNewDayName}
            isSplit={isSplit}
          />
        </DragDropContext>

        {/* Only show save button for new programs (no auto-save) */}
        {!isEditing && (
          <div className="flex gap-4">
            <Button onClick={handleSave} size="lg" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : saveButtonText}
            </Button>
          </div>
        )}
      </div>

      {/* Pre-render ExerciseSelector so it's ready instantly when modal opens */}
      <ExerciseSelector
        exercises={exercises}
        open={!!(editingDay && editingWeek)}
        onSelect={(exerciseId) => {
          addExerciseToDay(editingDay!, editingWeek!, exerciseId);
          setEditingDay(null);
          setEditingWeek(null);
        }}
        onClose={() => {
          setEditingDay(null);
          setEditingWeek(null);
        }}
        onExerciseCreated={async (exerciseId) => {
          await refetchExercises();
          // The ExerciseSelector will auto-select the exercise after refetch
        }}
      />

      <Dialog open={dayToDelete !== null} onOpenChange={(open) => !open && setDayToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workout Day</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{days.find(d => d.id === dayToDelete)?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDayToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteDay}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
