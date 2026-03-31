'use client';

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Program, WorkoutDay, ExerciseLog, SetLog, WorkoutLog, Exercise } from '@/types/exercise';
import { useExercises } from '@/hooks/use-exercises';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/toast';
import { ArrowLeft, Check, ChevronRight, ChevronLeft, Loader2, Trophy, FileText, X } from 'lucide-react';

interface ExerciseGroup {
  exercises: { index: number; exerciseId: string; supersetId?: string }[];
  isSuperSet: boolean;
}

interface PR { exerciseId: string; maxWeight: number; maxReps: number; date: string; }

function ImageLightbox({ images, initialIndex, onClose }: { images: string[]; initialIndex: number; onClose: () => void }) {
  const [index, setIndex] = useState(initialIndex);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && index > 0) setIndex(i => i - 1);
      if (e.key === 'ArrowRight' && index < images.length - 1) setIndex(i => i + 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [index, images.length, onClose]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsDragging(true);
    setDragOffset(0);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const delta = e.touches[0].clientX - touchStartX.current;
    // Add resistance at edges
    if ((index === 0 && delta > 0) || (index === images.length - 1 && delta < 0)) {
      setDragOffset(delta * 0.3);
    } else {
      setDragOffset(delta);
    }
  };

  const onTouchEnd = () => {
    setIsDragging(false);
    const threshold = 50;
    if (dragOffset > threshold && index > 0) {
      setIndex(i => i - 1);
    } else if (dragOffset < -threshold && index < images.length - 1) {
      setIndex(i => i + 1);
    }
    setDragOffset(0);
  };

  const containerWidth = containerRef.current?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 400);
  const translateX = -(index * containerWidth) + dragOffset;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-black">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-medium">{index + 1} / {images.length}</span>
        <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10 touch-manipulation">
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Image carousel */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex h-full"
          style={{
            transform: `translateX(${translateX}px)`,
            transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
            width: `${images.length * 100}%`,
          }}
        >
          {images.map((img, i) => (
            <div
              key={i}
              className="relative h-full flex items-center justify-center"
              style={{ width: `${containerWidth}px` }}
            >
              <Image
                src={`/exercise-images/${img}`}
                alt={`Exercise image ${i + 1}`}
                fill
                className="object-contain"
                sizes="100vw"
                priority={i === index}
              />
            </div>
          ))}
        </div>

        {/* Desktop arrow buttons */}
        {index > 0 && (
          <button
            onClick={() => setIndex(i => i - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-3 text-white hover:bg-black/60 hidden sm:block"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        {index < images.length - 1 && (
          <button
            onClick={() => setIndex(i => i + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-3 text-white hover:bg-black/60 hidden sm:block"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Dots indicator */}
      {images.length > 1 && (
        <div className="flex justify-center gap-2 pb-6 pt-3">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all touch-manipulation ${
                i === index ? 'w-6 bg-white' : 'w-2 bg-white/40'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WorkoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const programId = searchParams?.get('programId');
  const dayId = searchParams?.get('dayId');
  const weekParam = searchParams?.get('week') as 'A' | 'B' | null;
  const { exercises } = useExercises();

  const [program, setProgram] = useState<Program | null>(null);
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<'A' | 'B'>(weekParam || 'A');
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [isFinishing, setIsFinishing] = useState(false);
  const [showFinishWarning, setShowFinishWarning] = useState(false);
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [prs, setPrs] = useState<Record<string, PR>>({});
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const notesTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFinishingRef = useRef(false);

  // Fetch program
  useEffect(() => {
    if (!programId) return;
    fetch(`/api/programs/${programId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) return;
        setProgram(data);
        const isSplit = data.isSplit !== false;
        if (!isSplit) setSelectedWeek('A');
        else if (weekParam) setSelectedWeek(weekParam);
        if (dayId) {
          const day = data.days?.find((d: WorkoutDay) => d.id === dayId);
          if (day) setSelectedDay(day);
        } else if (data.days?.length > 0) {
          setSelectedDay(data.days[0]);
        }
      });
  }, [programId, dayId, weekParam]);

  // Fetch PRs
  useEffect(() => {
    fetch('/api/workout-logs/prs').then(r => r.json()).then(d => { if (!d.error) setPrs(d); });
  }, []);

  // Initialize exercise logs from progress or previous logs
  useEffect(() => {
    if (!selectedDay || !programId || !dayId) return;
    const isSplit = program?.isSplit !== false;
    const ew = isSplit ? selectedWeek : 'A';
    const programExercises = ew === 'A' ? selectedDay.weekA : selectedDay.weekB;

    const initLogs = (exs: typeof programExercises, prevLog?: WorkoutLog) => {
      return exs.map(ex => {
        const exDetails = exercises.find(e => e.id === ex.exerciseId);
        const isCardio = exDetails?.category === 'cardio';
        const prevExLog = prevLog?.exercises.find(e => e.exerciseId === ex.exerciseId);
        const setCount = isCardio ? 1 : (prevExLog?.sets.length || ex.sets || 0);
        return {
          exerciseId: ex.exerciseId,
          sets: Array(setCount).fill(null).map((_, si) => {
            const prevSet = prevExLog?.sets[si];
            if (prevSet?.completed) {
              return isCardio
                ? { distance: prevSet.distance, completed: false }
                : { reps: prevSet.reps, weight: prevSet.weight, completed: false };
            }
            return isCardio
              ? { distance: ex.distance || 0, completed: false }
              : { reps: ex.reps || 0, weight: undefined, completed: false };
          }),
        };
      });
    };

    // Try loading progress first
    fetch(`/api/workout-progress?programId=${programId}&dayId=${dayId}&week=${ew}`)
      .then(r => r.json())
      .then(progressData => {
        if (progressData.progress) {
          setCurrentExerciseIndex(progressData.progress.currentExerciseIndex || 0);
          setExerciseLogs(progressData.progress.exercises || []);
          if (progressData.progress.updatedAt) setLastSavedAt(new Date(progressData.progress.updatedAt));
          return;
        }
        // Fall back to previous logs
        return fetch(`/api/workout-logs?programId=${programId}&dayId=${dayId}`)
          .then(r => r.json())
          .then((logs: WorkoutLog[]) => {
            if (!Array.isArray(logs)) return;
            const weekLogs = logs.filter(l => !isSplit || l.week === selectedWeek).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setExerciseLogs(initLogs(programExercises, weekLogs[0]));
          });
      })
      .catch(() => setExerciseLogs(initLogs(programExercises)));
  }, [selectedDay, selectedWeek, programId, dayId, program, exercises]);

  // Save progress (debounced)
  const saveProgress = useCallback(async () => {
    if (!program || !selectedDay || !programId || !dayId || exerciseLogs.length === 0) return;
    const ew = program.isSplit !== false ? selectedWeek : 'A';
    setIsSaving(true);
    try {
      const res = await fetch('/api/workout-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programId, dayId, week: ew, currentExerciseIndex, exercises: exerciseLogs }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.updatedAt) setLastSavedAt(new Date(d.updatedAt));
      }
    } catch {}
    setIsSaving(false);
  }, [program, selectedDay, programId, dayId, selectedWeek, currentExerciseIndex, exerciseLogs]);

  useEffect(() => {
    if (exerciseLogs.length === 0) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(saveProgress, 1500);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [exerciseLogs, currentExerciseIndex, saveProgress]);

  // Fetch notes for current exercise
  useEffect(() => {
    setWorkoutNotes('');
    if (!program || !programId || !dayId || !currentExercise) return;
    const ew = program.isSplit !== false ? selectedWeek : 'A';
    fetch(`/api/workout-notes?programId=${programId}&dayId=${dayId}&week=${ew}&exerciseId=${currentExercise.id}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d) && d.length > 0) setWorkoutNotes(d[0].notes || ''); });
  }, [programId, dayId, selectedWeek, currentExerciseIndex]);

  const saveNotes = useCallback(async (notes: string) => {
    if (!program || !programId || !dayId || !currentExercise) return;
    const ew = program.isSplit !== false ? selectedWeek : 'A';
    fetch('/api/workout-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ programId, dayId, week: ew, exerciseId: currentExercise.id, notes }),
    });
  }, [program, programId, dayId, selectedWeek, currentExerciseIndex]);

  const handleNotesChange = (v: string) => {
    setWorkoutNotes(v);
    if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current);
    notesTimeoutRef.current = setTimeout(() => saveNotes(v), 1000);
  };

  // Derived state
  const currentExercises = selectedDay
    ? (program?.isSplit !== false ? selectedWeek : 'A') === 'A' ? selectedDay.weekA : selectedDay.weekB
    : [];

  const exerciseGroups = useMemo((): ExerciseGroup[] => {
    if (!currentExercises.length) return [];
    const groups: ExerciseGroup[] = [];
    const processed = new Set<number>();
    currentExercises.forEach((ex, i) => {
      if (processed.has(i)) return;
      if (ex.supersetId) {
        const ssExs = currentExercises.map((e, idx) => ({ e, idx })).filter(({ e }) => e.supersetId === ex.supersetId);
        groups.push({ exercises: ssExs.map(({ e, idx }) => ({ index: idx, exerciseId: e.exerciseId, supersetId: e.supersetId })), isSuperSet: true });
        ssExs.forEach(({ idx }) => processed.add(idx));
      } else {
        groups.push({ exercises: [{ index: i, exerciseId: ex.exerciseId }], isSuperSet: false });
        processed.add(i);
      }
    });
    return groups;
  }, [currentExercises]);

  const currentProgramExercise = currentExercises[currentExerciseIndex];
  const currentExercise = currentProgramExercise ? exercises.find(e => e.id === currentProgramExercise.exerciseId) : null;
  const currentLog = exerciseLogs[currentExerciseIndex];
  const isCardio = currentExercise?.category === 'cardio';
  const pr = currentExercise ? prs[currentExercise.id] : undefined;

  const updateSet = (setIdx: number, updates: Partial<SetLog>) => {
    setExerciseLogs(prev => prev.map((log, i) =>
      i === currentExerciseIndex
        ? { ...log, sets: log.sets.map((s, si) => si === setIdx ? { ...s, ...updates } : s) }
        : log
    ));
  };

  const addSet = () => {
    setExerciseLogs(prev => prev.map((log, i) =>
      i === currentExerciseIndex
        ? { ...log, sets: [...log.sets, isCardio ? { distance: 0, completed: false } : { reps: 0, weight: undefined, completed: false }] }
        : log
    ));
  };

  const removeSet = (setIdx: number) => {
    setExerciseLogs(prev => prev.map((log, i) =>
      i === currentExerciseIndex
        ? { ...log, sets: log.sets.filter((_, si) => si !== setIdx) }
        : log
    ));
  };

  const goNext = () => {
    if (currentExerciseIndex < currentExercises.length - 1) setCurrentExerciseIndex(i => i + 1);
  };

  const goPrev = () => {
    if (currentExerciseIndex > 0) setCurrentExerciseIndex(i => i - 1);
  };

  const finishWorkout = async () => {
    if (isFinishingRef.current) return;
    isFinishingRef.current = true;
    setIsFinishing(true);
    try {
      const ew = program?.isSplit !== false ? selectedWeek : 'A';
      // Save workout log
      await fetch('/api/workout-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programId, dayId, week: ew, date: new Date().toISOString(), exercises: exerciseLogs }),
      });
      // Delete progress
      await fetch(`/api/workout-progress?programId=${programId}&dayId=${dayId}&week=${ew}`, { method: 'DELETE' });
      toast({ title: 'Workout complete!', variant: 'success' });
      router.push('/programs');
    } catch {
      toast({ title: 'Error saving workout', variant: 'destructive' });
    }
    isFinishingRef.current = false;
    setIsFinishing(false);
  };

  const abandonWorkout = async () => {
    try {
      const ew = program?.isSplit !== false ? selectedWeek : 'A';
      await fetch(`/api/workout-progress?programId=${programId}&dayId=${dayId}&week=${ew}`, { method: 'DELETE' });
      router.push('/programs');
    } catch {
      router.push('/programs');
    }
  };

  const handleFinish = () => {
    const incomplete = exerciseLogs.some(log => log.sets.some(s => !s.completed));
    if (incomplete) setShowFinishWarning(true);
    else finishWorkout();
  };

  // Loading
  if (!program || !selectedDay || !currentExercise || !currentLog) {
    return (
      <div className="flex h-[60dvh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  const completedSets = currentLog.sets.filter(s => s.completed).length;
  const totalSets = currentLog.sets.length;
  const overallCompleted = exerciseLogs.reduce((acc, log) => acc + log.sets.filter(s => s.completed).length, 0);
  const overallTotal = exerciseLogs.reduce((acc, log) => acc + log.sets.length, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--background)] px-4 pt-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={() => setShowAbandonModal(true)} className="-ml-2">
          <ArrowLeft className="mr-1 h-4 w-4" /> Exit
        </Button>
        <div className="text-xs text-[var(--muted-foreground)]">
          {isSaving ? 'Saving...' : lastSavedAt ? `Saved ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-[var(--muted-foreground)] mb-1">
          <span>{selectedDay.name}</span>
          <span>{overallCompleted}/{overallTotal} sets</span>
        </div>
        <div className="h-2 w-full rounded-full bg-[var(--muted)] overflow-hidden">
          <div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${overallTotal > 0 ? (overallCompleted / overallTotal) * 100 : 0}%` }} />
        </div>
      </div>

      {/* Exercise Nav */}
      <div className="flex items-center gap-2 mb-4">
        <Button variant="outline" size="icon" onClick={goPrev} disabled={currentExerciseIndex === 0}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 text-center">
          <p className="text-xs text-[var(--muted-foreground)]">{currentExerciseIndex + 1}/{currentExercises.length}</p>
          <h2 className="text-lg font-bold truncate">{currentExercise.name}</h2>
        </div>
        <Button variant="outline" size="icon" onClick={goNext} disabled={currentExerciseIndex === currentExercises.length - 1}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Exercise Image - tap to open fullscreen */}
      {currentExercise.images.length > 0 && (
        <button
          onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
          className="relative mb-4 h-40 w-full overflow-hidden rounded-xl bg-[var(--muted)] touch-manipulation"
        >
          <Image src={`/exercise-images/${currentExercise.images[0]}`} alt={currentExercise.name} fill className="object-cover" sizes="(max-width: 640px) 100vw, 512px" priority />
          {currentExercise.images.length > 1 && (
            <div className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2.5 py-1 text-xs text-white font-medium">
              1/{currentExercise.images.length}
            </div>
          )}
        </button>
      )}

      {/* PR + Info */}
      <div className="flex gap-2 mb-4">
        {pr && (
          <Badge variant="secondary" className="gap-1">
            <Trophy className="h-3 w-3" /> PR: {pr.maxWeight}lbs x {pr.maxReps}
          </Badge>
        )}
        <Badge variant="secondary">{completedSets}/{totalSets} sets</Badge>
        <Button variant="ghost" size="sm" onClick={() => setShowNotes(!showNotes)} className="ml-auto">
          <FileText className="h-4 w-4" />
        </Button>
      </div>

      {/* Notes */}
      {showNotes && (
        <Textarea
          value={workoutNotes}
          onChange={e => handleNotesChange(e.target.value)}
          placeholder="Workout notes..."
          className="mb-4"
          rows={3}
        />
      )}

      {/* Sets */}
      <div className="space-y-3 mb-6">
        {currentLog.sets.map((set, si) => (
          <div
            key={si}
            className={`flex items-center gap-3 rounded-xl p-4 transition-colors ${set.completed ? 'bg-[var(--success)]/10 border border-[var(--success)]/30' : 'bg-[var(--muted)]'}`}
          >
            <span className="text-sm font-medium w-6 text-center text-[var(--muted-foreground)]">{si + 1}</span>
            {isCardio ? (
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={set.distance ?? ''}
                onChange={e => updateSet(si, { distance: Number(e.target.value) || undefined })}
                placeholder="miles"
                className="flex-1 h-12"
              />
            ) : (
              <>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={set.weight ?? ''}
                  onChange={e => updateSet(si, { weight: Number(e.target.value) || undefined })}
                  placeholder="lbs"
                  className="w-20 h-12"
                />
                <span className="text-[var(--muted-foreground)]">&times;</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={set.reps ?? ''}
                  onChange={e => updateSet(si, { reps: Number(e.target.value) || undefined })}
                  placeholder="reps"
                  className="w-20 h-12"
                />
              </>
            )}
            <Button
              variant={set.completed ? 'default' : 'outline'}
              size="icon"
              onClick={() => updateSet(si, { completed: !set.completed })}
              className={set.completed ? 'bg-[var(--success)] hover:bg-[var(--success)]/90' : ''}
            >
              <Check className="h-5 w-5" />
            </Button>
            {currentLog.sets.length > 1 && (
              <Button variant="ghost" size="icon-sm" onClick={() => removeSet(si)} className="text-[var(--muted-foreground)]">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3 mb-4">
        <Button variant="outline" size="lg" className="flex-1" onClick={addSet}>
          + Add Set
        </Button>
      </div>

      {/* Finish - only on last exercise */}
      {currentExerciseIndex === currentExercises.length - 1 && (
        <Button size="lg" className="w-full" onClick={handleFinish} disabled={isFinishing}>
          {isFinishing ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Finish Workout'}
        </Button>
      )}

      {/* Fullscreen Image Lightbox */}
      {lightboxOpen && currentExercise.images.length > 0 && (
        <ImageLightbox
          images={currentExercise.images}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      {/* Finish Warning */}
      <AlertDialog open={showFinishWarning} onOpenChange={setShowFinishWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Incomplete sets</AlertDialogTitle>
            <AlertDialogDescription>Some sets are not marked as completed. Finish anyway?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowFinishWarning(false); finishWorkout(); }}>Finish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Abandon */}
      <AlertDialog open={showAbandonModal} onOpenChange={setShowAbandonModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit workout?</AlertDialogTitle>
            <AlertDialogDescription>Your progress is saved and you can resume later.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push('/programs')}>Save & Exit</AlertDialogAction>
            <AlertDialogAction onClick={abandonWorkout} className="bg-[var(--destructive)]">Abandon</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function WorkoutPage() {
  return (
    <Suspense fallback={<div className="flex h-dvh items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[var(--muted-foreground)]" /></div>}>
      <WorkoutContent />
    </Suspense>
  );
}
