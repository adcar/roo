'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Program, WorkoutDay, ProgramExercise } from '@/types/exercise';
import { useExercises } from '@/hooks/useExercises';
import ExerciseSelector from '@/components/ExerciseSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Save } from 'lucide-react';
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
  const { exercises } = useExercises();
  const [programName, setProgramName] = useState(initialProgram?.name || '');
  const [days, setDays] = useState<WorkoutDay[]>(initialProgram?.days || []);
  const [isSplit, setIsSplit] = useState(initialProgram?.isSplit !== false); // Default to true for backward compatibility
  const [activeTab, setActiveTab] = useState<string>('');
  const [showDayInput, setShowDayInput] = useState(false);
  const [newDayName, setNewDayName] = useState('');
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editingWeek, setEditingWeek] = useState<'A' | 'B' | null>(null);
  const [dayToDelete, setDayToDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (days.length > 0 && (!activeTab || !days.find(d => d.id === activeTab))) {
      setActiveTab(days[0].id);
    } else if (days.length === 0) {
      setActiveTab('');
    }
  }, [days, activeTab]);

  const addDay = () => {
    if (!newDayName.trim()) return;

    const newDay: WorkoutDay = {
      id: Date.now().toString(),
      name: newDayName,
      weekA: [],
      weekB: [],
    };

    setDays([...days, newDay]);
    setActiveTab(newDay.id);
    setNewDayName('');
    setShowDayInput(false);
  };

  const handleDeleteClick = (dayId: string) => {
    if (days.length > 1) {
      setDayToDelete(dayId);
    } else {
      toast('Cannot remove the last day', { variant: 'destructive' });
    }
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
      await onSave({ name: programName, days, isSplit });
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
          <h1 className="text-4xl font-bold">{title}</h1>
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
          <CardContent>
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
            <p className="text-sm text-muted-foreground mt-2">
              {isSplit 
                ? 'This program alternates between two different workout weeks (A and B).'
                : 'This program uses the same exercises every week (no alternation).'}
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Workout Days</h2>
          {!showDayInput && (
            <Button onClick={() => setShowDayInput(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Day
            </Button>
          )}
        </div>

        {showDayInput && (
          <Card className="mb-4">
            <CardContent className="pt-6">
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newDayName}
                  onChange={(e) => setNewDayName(e.target.value)}
                  placeholder="e.g., Leg Day, Pull Day, Chest Day"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && addDay()}
                />
                <Button onClick={addDay} size="sm">Add</Button>
                <Button onClick={() => { setShowDayInput(false); setNewDayName(''); }} variant="outline" size="sm">Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {days.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground mb-4">No workout days added yet</p>
              <Button onClick={() => setShowDayInput(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Day
              </Button>
            </CardContent>
          </Card>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <DayTabs
              days={days}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onDeleteClick={handleDeleteClick}
              getExerciseName={getExerciseName}
              updateExercise={updateExercise}
              removeExercise={removeExercise}
              onAddExercise={(dayId, week) => {
                setEditingDay(dayId);
                setEditingWeek(week);
              }}
              isSplit={isSplit}
            />
          </DragDropContext>
        )}

        <div className="flex gap-4">
          <Button onClick={handleSave} size="lg" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : saveButtonText}
          </Button>
          <Link href={cancelUrl}>
            <Button variant="outline" size="lg">
              Cancel
            </Button>
          </Link>
        </div>
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
