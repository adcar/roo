'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { filterExercises } from '@/hooks/useExercises';
import { Exercise } from '@/types/exercise';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ALL_MUSCLE_OPTIONS } from '@/components/ExercisesTab/utils';

interface ExerciseSelectorProps {
  exercises: Exercise[];
  open?: boolean;
  onSelect: (exerciseId: string) => void;
  onClose: () => void;
}

export default function ExerciseSelector({ exercises, open = true, onSelect, onClose }: ExerciseSelectorProps) {
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const exercisesPerPage = 20;

  // Use static list instead of computing from exercises to avoid lag
  const allMuscles = ALL_MUSCLE_OPTIONS;

  const filteredExercises = useMemo(() => {
    return filterExercises(exercises, {
      search,
      primaryMuscle: selectedMuscle && selectedMuscle !== 'all' ? selectedMuscle : undefined,
      level: selectedLevel && selectedLevel !== 'all' ? selectedLevel : undefined,
    });
  }, [exercises, search, selectedMuscle, selectedLevel]);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [search, selectedMuscle, selectedLevel]);

  const totalPages = Math.ceil(filteredExercises.length / exercisesPerPage);
  const startIndex = (currentPage - 1) * exercisesPerPage;
  const paginatedExercises = filteredExercises.slice(startIndex, startIndex + exercisesPerPage);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Select Exercise</DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-3 gap-3 mb-4">
          <Input
            type="text"
            placeholder="Search exercises..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <Select value={selectedMuscle} onValueChange={setSelectedMuscle}>
            <SelectTrigger>
              <SelectValue placeholder="All Muscles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Muscles</SelectItem>
              {allMuscles.map(muscle => (
                <SelectItem key={muscle} value={muscle}>{muscle}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedLevel} onValueChange={setSelectedLevel}>
            <SelectTrigger>
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="expert">Expert</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="grid md:grid-cols-2 gap-4">
                {paginatedExercises.map(exercise => (
              <Card
                key={exercise.id}
                onClick={() => onSelect(exercise.id)}
                className="cursor-pointer hover:shadow-lg transition-all py-0"
              >
                <CardContent className="p-4">
                  {exercise.images[0] && (
                    <div className="relative w-full h-32 mb-3 rounded overflow-hidden bg-muted">
                      <Image
                        src={`/exercise-images/${exercise.images[0]}`}
                        alt={exercise.name}
                        fill
                        className="object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <h3 className="font-semibold mb-2">{exercise.name}</h3>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {exercise.primaryMuscles.slice(0, 3).map(muscle => (
                      <Badge key={muscle} variant="secondary" className="text-xs">{muscle}</Badge>
                    ))}
                  </div>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span className="capitalize">{exercise.level}</span>
                    <span>•</span>
                    <span className="capitalize">{exercise.equipment}</span>
                  </div>
                </CardContent>
              </Card>
                ))}
          </div>

          {filteredExercises.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No exercises found matching your filters
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} ({filteredExercises.length} exercise{filteredExercises.length !== 1 ? 's' : ''})
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
