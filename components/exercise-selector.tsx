'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import type { Exercise } from '@/types/exercise';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const ALL_MUSCLES = [
  'abdominals', 'abductors', 'adductors', 'biceps', 'calves', 'chest',
  'forearms', 'glutes', 'hamstrings', 'lats', 'lower back', 'middle back',
  'neck', 'quadriceps', 'shoulders', 'traps', 'triceps',
];

interface Props {
  exercises: Exercise[];
  open: boolean;
  onSelect: (exerciseId: string) => void;
  onClose: () => void;
}

export function ExerciseSelector({ exercises, open, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [muscle, setMuscle] = useState('');
  const [level, setLevel] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 20;

  const filtered = useMemo(() => {
    let result = exercises;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(e => e.name.toLowerCase().includes(q));
    }
    if (muscle && muscle !== 'all') {
      result = result.filter(e => e.primaryMuscles.includes(muscle));
    }
    if (level && level !== 'all') {
      result = result.filter(e => e.level === level);
    }
    return result;
  }, [exercises, search, muscle, level]);

  // Reset page on filter change
  useMemo(() => setPage(1), [search, muscle, level]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85dvh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Exercise</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            placeholder="Search exercises..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="flex gap-2">
            <Select value={muscle} onValueChange={setMuscle}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="All Muscles" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Muscles</SelectItem>
                {ALL_MUSCLES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="w-36"><SelectValue placeholder="All Levels" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="expert">Expert</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto mt-3 space-y-2">
          {paginated.map(ex => (
            <button
              key={ex.id}
              onClick={() => onSelect(ex.id)}
              className="flex w-full items-center gap-3 rounded-xl bg-[var(--muted)] p-3 text-left transition-colors active:bg-[var(--accent)] touch-manipulation"
            >
              {ex.images[0] && (
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[var(--background)]">
                  <Image src={`/exercise-images/${ex.images[0]}`} alt={ex.name} fill className="object-cover" sizes="48px" loading="lazy" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{ex.name}</p>
                <div className="flex gap-1.5 mt-1">
                  {ex.primaryMuscles.slice(0, 2).map(m => (
                    <Badge key={m} variant="secondary" className="text-[10px]">{m}</Badge>
                  ))}
                  <span className="text-xs text-[var(--muted-foreground)] capitalize">{ex.level}</span>
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center py-8 text-[var(--muted-foreground)]">No exercises found</p>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
            <span className="text-xs text-[var(--muted-foreground)]">{page}/{totalPages} ({filtered.length})</span>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
