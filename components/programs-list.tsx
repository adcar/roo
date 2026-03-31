'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Program } from '@/types/exercise';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Play, Settings, ChevronRight, Dumbbell, MoreHorizontal, Edit } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/toast';

type WeekMapping = 'oddA' | 'oddB';

function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getCurrentWeekLetter(mapping: WeekMapping = 'oddA'): 'A' | 'B' {
  const weekNumber = getISOWeekNumber(new Date());
  const isOdd = weekNumber % 2 === 1;
  return mapping === 'oddA' ? (isOdd ? 'A' : 'B') : (isOdd ? 'B' : 'A');
}

interface Props {
  initialPrograms: Program[];
  initialWeekMapping: WeekMapping;
  initialInProgress: Record<string, { week: string; updatedAt: string }>;
}

export function ProgramsList({ initialPrograms, initialWeekMapping, initialInProgress }: Props) {
  const router = useRouter();
  const [programs, setPrograms] = useState(initialPrograms);
  const [weekMapping, setWeekMapping] = useState(initialWeekMapping);
  const [selectedWeek] = useState<'A' | 'B'>(getCurrentWeekLetter(initialWeekMapping));
  const [inProgress, setInProgress] = useState(initialInProgress);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const weekNumber = getISOWeekNumber(new Date());

  const handleDelete = async (programId: string) => {
    if (!confirm('Delete this program?')) return;
    try {
      await fetch(`/api/programs/${programId}`, { method: 'DELETE' });
      setPrograms(prev => prev.filter(p => p.id !== programId));
      toast({ title: 'Program deleted' });
    } catch {
      toast({ title: 'Error deleting program', variant: 'destructive' });
    }
  };

  const handleMappingChange = async (mapping: WeekMapping) => {
    try {
      await fetch('/api/user-settings/week-mapping', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekMapping: mapping }),
      });
      setWeekMapping(mapping);
      setSettingsOpen(false);
    } catch {
      toast({ title: 'Error updating setting', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Programs</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Week {weekNumber} &middot; Week {selectedWeek}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}>
            <Settings className="h-5 w-5" />
          </Button>
          <Link href="/programs/new">
            <Button size="icon">
              <Plus className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Programs */}
      {programs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Dumbbell className="h-12 w-12 text-[var(--muted-foreground)]" />
            <p className="text-[var(--muted-foreground)]">No programs yet</p>
            <Link href="/programs/new">
              <Button size="lg">
                <Plus className="mr-2 h-5 w-5" />
                Create Program
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {programs.map(program => {
            const isSplit = program.isSplit !== false;

            return (
              <Card key={program.id}>
                <CardContent className="p-4">
                  {/* Title row */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold truncate">{program.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-[var(--muted-foreground)]">
                          {program.days.length} day{program.days.length !== 1 ? 's' : ''}
                        </span>
                        {isSplit && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">A/B</Badge>}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/programs/${program.id}`)}>
                          <ChevronRight className="h-4 w-4 mr-2" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/programs/${program.id}/edit`)}>
                          <Edit className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(program.id)} className="text-[var(--destructive)]">
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Day chips - one tap to start */}
                  <div className="flex flex-wrap gap-2">
                    {program.days.map(day => {
                      const key = `${program.id}-${day.id}`;
                      const isInProg = !!inProgress[key];
                      return (
                        <Link
                          key={day.id}
                          href={`/workout?programId=${program.id}&dayId=${day.id}&week=${selectedWeek}`}
                          className="touch-manipulation"
                        >
                          <div className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors active:scale-[0.97] ${
                            isInProg
                              ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                              : 'bg-[var(--muted)] text-[var(--foreground)] active:bg-[var(--accent)]'
                          }`}>
                            <Play className="h-3.5 w-3.5" />
                            {day.name}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Week Mapping Settings */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Week Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-[var(--muted-foreground)]">
              Current: Week {weekNumber} = Week {selectedWeek}
            </p>
            <div className="flex flex-col gap-3">
              <Button
                variant={weekMapping === 'oddA' ? 'default' : 'outline'}
                size="lg"
                onClick={() => handleMappingChange('oddA')}
                className="justify-start"
              >
                Odd weeks = Week A
              </Button>
              <Button
                variant={weekMapping === 'oddB' ? 'default' : 'outline'}
                size="lg"
                onClick={() => handleMappingChange('oddB')}
                className="justify-start"
              >
                Odd weeks = Week B
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
