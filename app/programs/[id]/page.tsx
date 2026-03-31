'use client';

import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Program } from '@/types/exercise';
import type { IExerciseData, Muscle } from 'react-body-highlighter';
import { useExercises } from '@/hooks/use-exercises';
import { mapMuscleName } from '@/lib/muscle-map';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Edit, Play } from 'lucide-react';

const Model = lazy(() => import('react-body-highlighter').then(m => ({ default: m.default })));

export default function ProgramDetailPage() {
  const params = useParams();
  const { exercises } = useExercises();
  const [program, setProgram] = useState<Program | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<string>('all');
  const [selectedWeek, setSelectedWeek] = useState<'A' | 'B' | 'both'>('both');

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/programs/${params.id}`)
      .then(res => {
        if (!res.ok) { setNotFound(true); return null; }
        return res.json();
      })
      .then(data => { if (data) setProgram(data); })
      .catch(() => setNotFound(true));
  }, [params.id]);

  // Compute muscle data from selected exercises
  const { exerciseData, muscleBadges, needsBackView } = useMemo(() => {
    if (!program || exercises.length === 0) return { exerciseData: [], muscleBadges: { primary: [], secondary: [] }, needsBackView: false };

    const selectedDays = selectedDayId === 'all'
      ? program.days
      : program.days.filter(d => d.id === selectedDayId);

    const allExerciseIds = new Set<string>();
    const isSplit = program.isSplit !== false;

    selectedDays.forEach(day => {
      if (selectedWeek === 'A' || selectedWeek === 'both') {
        day.weekA.forEach(pe => allExerciseIds.add(pe.exerciseId));
      }
      if (isSplit && (selectedWeek === 'B' || selectedWeek === 'both')) {
        day.weekB.forEach(pe => allExerciseIds.add(pe.exerciseId));
      }
    });

    const primaryMuscles = new Set<Muscle>();
    const secondaryMuscles = new Set<Muscle>();
    const primaryNames = new Set<string>();
    const secondaryNames = new Set<string>();
    const backMuscles = ['lats', 'middle back', 'lower back', 'traps'];
    let hasBack = false;

    allExerciseIds.forEach(exId => {
      const ex = exercises.find(e => e.id === exId);
      if (!ex) return;

      ex.primaryMuscles.forEach(m => {
        const mapped = mapMuscleName(m);
        if (mapped) { primaryMuscles.add(mapped); secondaryMuscles.delete(mapped); }
        primaryNames.add(m); secondaryNames.delete(m);
      });
      ex.secondaryMuscles.forEach(m => {
        const mapped = mapMuscleName(m);
        if (mapped && !primaryMuscles.has(mapped)) secondaryMuscles.add(mapped);
        if (!primaryNames.has(m)) secondaryNames.add(m);
      });
      if ([...ex.primaryMuscles, ...ex.secondaryMuscles].some(m => backMuscles.includes(m.toLowerCase()))) {
        hasBack = true;
      }
    });

    const data: IExerciseData[] = [];
    if (primaryMuscles.size > 0) {
      data.push({ name: 'Primary', muscles: Array.from(primaryMuscles) });
    }
    if (secondaryMuscles.size > 0) {
      const arr = Array.from(secondaryMuscles);
      data.push({ name: 'Secondary', muscles: arr });
      data.push({ name: 'Secondary', muscles: arr }); // twice for different color
    }

    return {
      exerciseData: data,
      muscleBadges: { primary: Array.from(primaryNames).sort(), secondary: Array.from(secondaryNames).sort() },
      needsBackView: hasBack,
    };
  }, [program, exercises, selectedDayId, selectedWeek]);

  if (notFound) {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-4">
        <p className="text-lg font-semibold">Program not found</p>
        <Link href="/programs"><Button variant="outline">Back to Programs</Button></Link>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="px-4 pt-6 space-y-4">
        <div className="h-8 w-48 rounded-lg bg-[var(--muted)] animate-pulse" />
        <div className="h-32 rounded-xl bg-[var(--muted)] animate-pulse" />
        <div className="h-32 rounded-xl bg-[var(--muted)] animate-pulse" />
      </div>
    );
  }

  const isSplit = program.isSplit !== false;
  const getExercise = (id: string) => exercises.find(ex => ex.id === id);

  return (
    <div className="px-4 pt-4 pb-8 space-y-5">
      {/* Back + Title */}
      <div>
        <Link href="/programs">
          <Button variant="ghost" size="sm" className="mb-2 -ml-2">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{program.name}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {program.days.length} day{program.days.length !== 1 ? 's' : ''}
          {program.durationWeeks ? ` \u00B7 ${program.durationWeeks} weeks` : ''}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link href={`/programs/${program.id}/edit`} className="flex-1">
          <Button size="lg" variant="outline" className="w-full gap-2">
            <Edit className="h-5 w-5" /> Edit Program
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Select value={selectedDayId} onValueChange={setSelectedDayId}>
          <SelectTrigger className="flex-1"><SelectValue placeholder="Day" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Days</SelectItem>
            {program.days.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {isSplit && (
          <Select value={selectedWeek} onValueChange={v => setSelectedWeek(v as any)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="both">Both</SelectItem>
              <SelectItem value="A">Week A</SelectItem>
              <SelectItem value="B">Week B</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Muscle Visualization */}
      {exerciseData.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h2 className="text-lg font-bold mb-3">Muscles Worked</h2>

            <Suspense fallback={<div className="flex gap-4 justify-center"><div className="w-[160px] h-[220px] bg-[var(--muted)] animate-pulse rounded-lg" /><div className="w-[160px] h-[220px] bg-[var(--muted)] animate-pulse rounded-lg" /></div>}>
              <div className="flex gap-4 justify-center mb-4">
                <div className="text-center">
                  <p className="text-xs text-[var(--muted-foreground)] mb-1">Front</p>
                  <Model
                    data={exerciseData}
                    style={{ width: '160px', height: '220px' }}
                    type="anterior"
                  />
                </div>
                {needsBackView && (
                  <div className="text-center">
                    <p className="text-xs text-[var(--muted-foreground)] mb-1">Back</p>
                    <Model
                      data={exerciseData}
                      style={{ width: '160px', height: '220px' }}
                      type="posterior"
                    />
                  </div>
                )}
              </div>
            </Suspense>

            <div className="space-y-2">
              {muscleBadges.primary.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--primary)]" />
                    <span className="text-xs font-medium text-[var(--muted-foreground)]">Primary</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {muscleBadges.primary.map(m => (
                      <Badge key={m} className="text-[11px]">{m}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {muscleBadges.secondary.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--secondary)]" />
                    <span className="text-xs font-medium text-[var(--muted-foreground)]">Secondary</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {muscleBadges.secondary.map(m => (
                      <Badge key={m} variant="secondary" className="text-[11px]">{m}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Days */}
      {program.days
        .filter(d => selectedDayId === 'all' || d.id === selectedDayId)
        .map(day => (
          <Card key={day.id}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">{day.name}</h2>
                <Link href={`/workout?programId=${program.id}&dayId=${day.id}`}>
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <Play className="h-3.5 w-3.5" /> Go
                  </Button>
                </Link>
              </div>

              {(['A', 'B'] as const)
                .filter(w => isSplit ? (selectedWeek === 'both' || selectedWeek === w) : w === 'A')
                .map(week => {
                  const exs = week === 'A' ? day.weekA : day.weekB;
                  if (!exs || exs.length === 0) return null;
                  return (
                    <div key={week} className="mb-4 last:mb-0">
                      {isSplit && (selectedWeek === 'both') && (
                        <p className="text-sm font-medium text-[var(--muted-foreground)] mb-2">Week {week}</p>
                      )}
                      <div className="space-y-2">
                        {exs.map((pe, idx) => {
                          const ex = getExercise(pe.exerciseId);
                          if (!ex) return null;
                          return (
                            <div key={idx} className="flex items-center gap-3 rounded-xl bg-[var(--muted)] p-3">
                              {ex.images[0] && (
                                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[var(--background)]">
                                  <Image src={`/exercise-images/${ex.images[0]}`} alt={ex.name} fill className="object-cover" sizes="56px" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{ex.name}</p>
                                <p className="text-xs text-[var(--muted-foreground)]">
                                  {ex.category === 'cardio'
                                    ? pe.distance ? `${pe.distance} mi` : ''
                                    : [pe.sets && `${pe.sets}s`, pe.reps && `${pe.reps}r`, pe.weight && `${pe.weight}lbs`].filter(Boolean).join(' \u00D7 ')}
                                </p>
                              </div>
                              {pe.supersetId && <Badge variant="secondary" className="text-[10px]">SS</Badge>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
