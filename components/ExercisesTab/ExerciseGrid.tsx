'use client';

import { Exercise } from '@/types/exercise';
import { ExerciseCard } from './ExerciseCard';
import { Button } from '@/components/ui/button';

interface ExerciseGridProps {
  exercises: Exercise[];
  currentPage: number;
  exercisesPerPage: number;
  onPageChange: (page: number) => void;
  onExerciseClick: (exercise: Exercise) => void;
  onEditClick?: (exercise: Exercise) => void;
  onDeleteClick?: (exerciseId: string) => void;
  showActions?: boolean;
}

export function ExerciseGrid({
  exercises,
  currentPage,
  exercisesPerPage,
  onPageChange,
  onExerciseClick,
  onEditClick,
  onDeleteClick,
  showActions = false,
}: ExerciseGridProps) {
  const totalPages = Math.ceil(exercises.length / exercisesPerPage);
  const startIndex = (currentPage - 1) * exercisesPerPage;
  const paginatedExercises = exercises.slice(startIndex, startIndex + exercisesPerPage);

  return (
    <>
      <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
        {paginatedExercises.map(exercise => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            onClick={() => onExerciseClick(exercise)}
            onEdit={showActions && exercise.isCustom && onEditClick ? () => onEditClick(exercise) : undefined}
            onDelete={showActions && exercise.isCustom && onDeleteClick && exercise.id ? () => onDeleteClick(exercise.id) : undefined}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages} ({exercises.length} exercise{exercises.length !== 1 ? 's' : ''})
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </>
  );
}


