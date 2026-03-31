'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { useExercises } from '@/hooks/use-exercises';
import type { Exercise } from '@/types/exercise';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

const ALL_MUSCLES = [
  'abdominals', 'abductors', 'adductors', 'biceps', 'calves', 'chest',
  'forearms', 'glutes', 'hamstrings', 'lats', 'lower back', 'middle back',
  'neck', 'quadriceps', 'shoulders', 'traps', 'triceps',
];

export default function ExercisesPage() {
  const { exercises, loading } = useExercises();
  const [search, setSearch] = useState('');
  const [muscle, setMuscle] = useState('');
  const [level, setLevel] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Exercise | null>(null);
  const perPage = 24;

  const filtered = useMemo(() => {
    let result = exercises;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(e => e.name.toLowerCase().includes(q));
    }
    if (muscle && muscle !== 'all') result = result.filter(e => e.primaryMuscles.includes(muscle));
    if (level && level !== 'all') result = result.filter(e => e.level === level);
    return result;
  }, [exercises, search, muscle, level]);

  useMemo(() => setPage(1), [search, muscle, level]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  if (loading) {
    return (
      <div className="flex h-[60dvh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-8">
      <h1 className="text-2xl font-bold mb-4">Exercises</h1>

      <div className="space-y-3 mb-4">
        <Input placeholder="Search exercises..." value={search} onChange={e => setSearch(e.target.value)} />
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

      <p className="text-sm text-[var(--muted-foreground)] mb-3">{filtered.length} exercises</p>

      <div className="grid grid-cols-2 gap-3">
        {paginated.map(ex => (
          <button
            key={ex.id}
            onClick={() => setSelected(ex)}
            className="flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] text-left transition-colors active:bg-[var(--accent)] touch-manipulation"
          >
            {ex.images[0] && (
              <div className="relative h-28 w-full bg-[var(--muted)]">
                <Image src={`/exercise-images/${ex.images[0]}`} alt={ex.name} fill className="object-cover" sizes="(max-width: 640px) 50vw, 200px" loading="lazy" />
              </div>
            )}
            <div className="p-3">
              <p className="font-medium text-sm line-clamp-2 mb-1">{ex.name}</p>
              <div className="flex flex-wrap gap-1">
                {ex.primaryMuscles.slice(0, 2).map(m => (
                  <Badge key={m} variant="secondary" className="text-[10px]">{m}</Badge>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
          <span className="text-xs text-[var(--muted-foreground)]">{page}/{totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}

      {/* Exercise Detail Modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        {selected && (
          <DialogContent className="max-h-[85dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selected.name}</DialogTitle>
            </DialogHeader>
            {selected.images[0] && (
              <div className="relative h-48 w-full overflow-hidden rounded-xl bg-[var(--muted)]">
                <Image src={`/exercise-images/${selected.images[0]}`} alt={selected.name} fill className="object-cover" sizes="(max-width: 640px) 100vw, 512px" />
              </div>
            )}
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Muscles</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.primaryMuscles.map(m => <Badge key={m}>{m}</Badge>)}
                  {selected.secondaryMuscles.map(m => <Badge key={m} variant="secondary">{m}</Badge>)}
                </div>
              </div>
              <div className="flex gap-4 text-sm">
                <div><span className="text-[var(--muted-foreground)]">Level:</span> <span className="capitalize">{selected.level}</span></div>
                <div><span className="text-[var(--muted-foreground)]">Equipment:</span> <span className="capitalize">{selected.equipment}</span></div>
                {selected.category && <div><span className="text-[var(--muted-foreground)]">Type:</span> <span className="capitalize">{selected.category}</span></div>}
              </div>
              {selected.instructions.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Instructions</p>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-[var(--muted-foreground)]">
                    {selected.instructions.map((inst, i) => <li key={i}>{inst}</li>)}
                  </ol>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
