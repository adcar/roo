'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import type { Program, WorkoutDay, ProgramExercise } from '@/types/exercise';
import { useExercises } from '@/hooks/use-exercises';
import { ExerciseSelector } from '@/components/exercise-selector';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { ArrowLeft, Plus, Save, Trash2, Link as LinkIcon, Unlink, X, ChevronUp, ChevronDown } from 'lucide-react';

interface ProgramFormProps {
  initialProgram?: Program;
  onSave: (data: Omit<Program, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  cancelUrl: string;
  title: string;
}

export default function ProgramForm({ initialProgram, onSave, cancelUrl, title }: ProgramFormProps) {
  const { exercises } = useExercises();
  const [programName, setProgramName] = useState(initialProgram?.name || '');
  const [days, setDays] = useState<WorkoutDay[]>(initialProgram?.days || []);
  const [isSplit, setIsSplit] = useState(initialProgram?.isSplit !== false);
  const [durationWeeks, setDurationWeeks] = useState<number | undefined>(initialProgram?.durationWeeks ?? undefined);
  const [activeDay, setActiveDay] = useState<string>('');
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editingWeek, setEditingWeek] = useState<'A' | 'B' | null>(null);
  const [dayToDelete, setDayToDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const isEditing = !!initialProgram?.id;

  useEffect(() => {
    if (days.length > 0 && !days.find(d => d.id === activeDay)) {
      setActiveDay(days[0].id);
    }
  }, [days, activeDay]);

  useEffect(() => {
    if (initialProgram) {
      setDurationWeeks(initialProgram.durationWeeks && initialProgram.durationWeeks > 0 ? initialProgram.durationWeeks : undefined);
    }
  }, [initialProgram]);

  const performAutoSave = useCallback(async () => {
    if (!isEditing || !programName.trim() || days.length === 0) return;
    setAutoSaving(true);
    try { await onSave({ name: programName, days, isSplit, durationWeeks }); } catch {}
    setAutoSaving(false);
  }, [isEditing, programName, days, isSplit, durationWeeks, onSave]);

  useEffect(() => {
    if (!isEditing) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(performAutoSave, 800);
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, [programName, days, isSplit, durationWeeks, isEditing, performAutoSave]);

  const addDay = () => {
    const newDay: WorkoutDay = {
      id: Date.now().toString(),
      name: `Day ${days.length + 1}`,
      weekA: [],
      weekB: [],
    };
    setDays([...days, newDay]);
    setActiveDay(newDay.id);
  };

  const updateDayName = (dayId: string, name: string) => {
    setDays(days.map(d => d.id === dayId ? { ...d, name } : d));
  };

  const deleteDay = (dayId: string) => {
    const newDays = days.filter(d => d.id !== dayId);
    setDays(newDays);
    setDayToDelete(null);
    if (activeDay === dayId && newDays.length > 0) setActiveDay(newDays[0].id);
  };

  const addExercise = (dayId: string, week: 'A' | 'B', exerciseId: string) => {
    setDays(days.map(day => {
      if (day.id !== dayId) return day;
      const key = week === 'A' ? 'weekA' : 'weekB';
      return { ...day, [key]: [...day[key], { exerciseId, sets: 3, reps: 10, order: day[key].length }] };
    }));
  };

  const removeExercise = (dayId: string, week: 'A' | 'B', idx: number) => {
    setDays(days.map(day => {
      if (day.id !== dayId) return day;
      const key = week === 'A' ? 'weekA' : 'weekB';
      return { ...day, [key]: day[key].filter((_, i) => i !== idx).map((ex, i) => ({ ...ex, order: i })) };
    }));
  };

  const updateExercise = (dayId: string, week: 'A' | 'B', idx: number, updates: Partial<ProgramExercise>) => {
    setDays(days.map(day => {
      if (day.id !== dayId) return day;
      const key = week === 'A' ? 'weekA' : 'weekB';
      return { ...day, [key]: day[key].map((ex, i) => i === idx ? { ...ex, ...updates } : ex) };
    }));
  };

  const linkExercises = (dayId: string, week: 'A' | 'B', i1: number, i2: number) => {
    setDays(days.map(day => {
      if (day.id !== dayId) return day;
      const key = week === 'A' ? 'weekA' : 'weekB';
      const exs = [...day[key]];
      const ssId = exs[i1].supersetId || exs[i2].supersetId || `ss-${Date.now()}`;
      return { ...day, [key]: exs.map((ex, i) => (i === i1 || i === i2) ? { ...ex, supersetId: ssId } : ex) };
    }));
  };

  const unlinkExercise = (dayId: string, week: 'A' | 'B', idx: number) => {
    setDays(days.map(day => {
      if (day.id !== dayId) return day;
      const key = week === 'A' ? 'weekA' : 'weekB';
      const exs = [...day[key]];
      const ssId = exs[idx].supersetId;
      if (!ssId) return day;
      const count = exs.filter(e => e.supersetId === ssId).length;
      if (count <= 2) {
        return { ...day, [key]: exs.map(e => e.supersetId === ssId ? { ...e, supersetId: undefined } : e) };
      }
      return { ...day, [key]: exs.map((e, i) => i === idx ? { ...e, supersetId: undefined } : e) };
    }));
  };

  const [movingIdx, setMovingIdx] = useState<{ dayId: string; week: 'A' | 'B'; from: number; to: number } | null>(null);

  const moveExercise = (dayId: string, week: 'A' | 'B', fromIdx: number, direction: 'up' | 'down') => {
    const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1;
    setMovingIdx({ dayId, week, from: fromIdx, to: toIdx });

    // Small delay so the animation plays before state updates
    setTimeout(() => {
      setDays(prev => prev.map(day => {
        if (day.id !== dayId) return day;
        const key = week === 'A' ? 'weekA' : 'weekB';
        const items = [...day[key]];
        if (toIdx < 0 || toIdx >= items.length) return day;
        const [moved] = items.splice(fromIdx, 1);
        items.splice(toIdx, 0, moved);
        return { ...day, [key]: items.map((ex, i) => ({ ...ex, order: i })) };
      }));
      setMovingIdx(null);
    }, 200);
  };

  const getExName = (id: string) => exercises.find(e => e.id === id)?.name || 'Unknown';
  const getExCategory = (id: string) => exercises.find(e => e.id === id)?.category;
  const currentDay = days.find(d => d.id === activeDay);

  const handleSave = async () => {
    if (!programName.trim()) { toast({ title: 'Enter a program name', variant: 'destructive' }); return; }
    if (days.length === 0) { toast({ title: 'Add at least one day', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      await onSave({ name: programName, days, isSplit, durationWeeks });
      toast({ title: 'Program saved', variant: 'success' });
    } catch { toast({ title: 'Failed to save', variant: 'destructive' }); }
    setSaving(false);
  };

  const renderWeek = (day: WorkoutDay, week: 'A' | 'B') => {
    const exs = week === 'A' ? day.weekA : day.weekB;
    return (
      <div className="space-y-2">
        {isSplit && <p className="text-sm font-medium text-[var(--muted-foreground)]">Week {week}</p>}
        {exs.map((pe, idx) => {
          const isCardio = getExCategory(pe.exerciseId) === 'cardio';
          const isMoving = movingIdx?.dayId === day.id && movingIdx?.week === week;
          let animateClass = '';
          if (isMoving) {
            if (idx === movingIdx.from) {
              animateClass = movingIdx.to < movingIdx.from ? '-translate-y-full' : 'translate-y-full';
            } else if (idx === movingIdx.to) {
              animateClass = movingIdx.to < movingIdx.from ? 'translate-y-full' : '-translate-y-full';
            }
          }
          return (
            <div
              key={pe.exerciseId + '-' + idx}
              className={`flex items-center gap-2 rounded-xl bg-[var(--muted)] p-3 transition-transform duration-200 ${animateClass}`}
            >
              {/* Reorder arrows */}
              <div className="flex flex-col -my-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => moveExercise(day.id, week, idx, 'up')}
                  disabled={idx === 0 || !!movingIdx}
                  className="h-7 w-7 text-[var(--muted-foreground)]"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => moveExercise(day.id, week, idx, 'down')}
                  disabled={idx === exs.length - 1 || !!movingIdx}
                  className="h-7 w-7 text-[var(--muted-foreground)]"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{getExName(pe.exerciseId)}</p>
                <div className="flex gap-2 mt-1.5">
                  {isCardio ? (
                    <Input
                      type="number"
                      value={pe.distance || ''}
                      onChange={e => updateExercise(day.id, week, idx, { distance: Number(e.target.value) || undefined })}
                      placeholder="mi"
                      className="h-10 w-20 text-sm"
                    />
                  ) : (
                    <>
                      <Input
                        type="number"
                        value={pe.sets || ''}
                        onChange={e => updateExercise(day.id, week, idx, { sets: Number(e.target.value) || undefined })}
                        placeholder="Sets"
                        className="h-10 w-16 text-sm"
                      />
                      <Input
                        type="number"
                        value={pe.reps || ''}
                        onChange={e => updateExercise(day.id, week, idx, { reps: Number(e.target.value) || undefined })}
                        placeholder="Reps"
                        className="h-10 w-16 text-sm"
                      />
                      <Input
                        type="number"
                        value={pe.weight || ''}
                        onChange={e => updateExercise(day.id, week, idx, { weight: Number(e.target.value) || undefined })}
                        placeholder="lbs"
                        className="h-10 w-20 text-sm"
                      />
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                {pe.supersetId ? (
                  <Button variant="ghost" size="icon-sm" onClick={() => unlinkExercise(day.id, week, idx)}>
                    <Unlink className="h-4 w-4" />
                  </Button>
                ) : idx < exs.length - 1 ? (
                  <Button variant="ghost" size="icon-sm" onClick={() => linkExercises(day.id, week, idx, idx + 1)}>
                    <LinkIcon className="h-4 w-4" />
                  </Button>
                ) : null}
                <Button variant="ghost" size="icon-sm" onClick={() => removeExercise(day.id, week, idx)} className="text-[var(--destructive)]">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
        <Button
          variant="outline"
          size="lg"
          className="w-full mt-2"
          onClick={() => { setEditingDay(day.id); setEditingWeek(week); }}
        >
          <Plus className="mr-2 h-4 w-4" /> Add Exercise
        </Button>
      </div>
    );
  };

  return (
    <div className="px-4 pt-4 pb-8">
      <Link href={cancelUrl}>
        <Button variant="ghost" size="sm" className="-ml-2 mb-2">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
      </Link>

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold">{title}</h1>
        {isEditing && autoSaving && <span className="text-xs text-[var(--muted-foreground)]">Saving...</span>}
      </div>

      {/* Program Name */}
      <Input
        value={programName}
        onChange={e => setProgramName(e.target.value)}
        placeholder="Program name"
        className="mb-4 text-lg font-medium"
      />

      {/* Settings */}
      <Card className="mb-5">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Checkbox id="split" checked={isSplit} onCheckedChange={c => setIsSplit(!!c)} />
            <Label htmlFor="split">A/B Split (alternate weeks)</Label>
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="duration" className="shrink-0">Duration</Label>
            <Select value={durationWeeks?.toString() || 'unlimited'} onValueChange={v => setDurationWeeks(v === 'unlimited' ? undefined : parseInt(v))}>
              <SelectTrigger id="duration"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unlimited">Unlimited</SelectItem>
                {[4, 6, 8, 12, 16, 20, 24].map(w => <SelectItem key={w} value={w.toString()}>{w} weeks</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Day Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {days.map(d => (
          <Button
            key={d.id}
            variant={activeDay === d.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveDay(d.id)}
            className="shrink-0"
          >
            {d.name}
          </Button>
        ))}
        <Button variant="outline" size="sm" onClick={addDay} className="shrink-0">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Active Day Content */}
      {currentDay && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              value={currentDay.name}
              onChange={e => updateDayName(currentDay.id, e.target.value)}
              className="flex-1 font-medium"
            />
            {days.length > 1 && (
              <Button variant="ghost" size="icon" onClick={() => setDayToDelete(currentDay.id)} className="text-[var(--destructive)]">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {renderWeek(currentDay, 'A')}
          {isSplit && (
            <>
              <div className="h-px bg-[var(--border)]" />
              {renderWeek(currentDay, 'B')}
            </>
          )}
        </div>
      )}

      {days.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <p className="text-[var(--muted-foreground)]">Add your first workout day</p>
            <Button size="lg" onClick={addDay}>
              <Plus className="mr-2 h-5 w-5" /> Add Day
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Save (new programs only) */}
      {!isEditing && (
        <Button size="lg" className="w-full mt-6" onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-5 w-5" /> {saving ? 'Saving...' : 'Save Program'}
        </Button>
      )}

      {/* Exercise Selector */}
      <ExerciseSelector
        exercises={exercises}
        open={!!(editingDay && editingWeek)}
        onSelect={exId => { addExercise(editingDay!, editingWeek!, exId); setEditingDay(null); setEditingWeek(null); }}
        onClose={() => { setEditingDay(null); setEditingWeek(null); }}
      />

      {/* Delete Day Confirm */}
      <Dialog open={dayToDelete !== null} onOpenChange={open => !open && setDayToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Day</DialogTitle>
            <DialogDescription>Delete "{days.find(d => d.id === dayToDelete)?.name}"? This can't be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDayToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => dayToDelete && deleteDay(dayToDelete)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
