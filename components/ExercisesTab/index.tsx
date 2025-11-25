'use client';

import { useState, useMemo, lazy, Suspense } from 'react';
import { useExercises, filterExercises } from '@/hooks/useExercises';
import { Exercise } from '@/types/exercise';
import { SearchInput } from './SearchInput';
import { ExerciseFilters } from './ExerciseFilters';
import { ExerciseGrid } from './ExerciseGrid';
import { ExerciseDetailModal } from './ExerciseDetailModal';

// Lazy load the CreateExerciseDialog to avoid loading it until needed
const CreateExerciseDialog = lazy(() => import('./CreateExerciseDialog').then(module => ({ default: module.CreateExerciseDialog })));

export default function ExercisesTab() {
  const { exercises, loading, error } = useExercises();
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const exercisesPerPage = 20;

  const filteredExercises = useMemo(() => {
    return filterExercises(exercises, {
      search: search || undefined,
      primaryMuscle: selectedMuscle && selectedMuscle !== 'all' ? selectedMuscle : undefined,
      level: selectedLevel && selectedLevel !== 'all' ? selectedLevel : undefined,
      category: selectedCategory && selectedCategory !== 'all' ? selectedCategory : undefined,
    });
  }, [exercises, search, selectedMuscle, selectedLevel, selectedCategory]);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [search, selectedMuscle, selectedLevel, selectedCategory]);

  if (loading) {
    return <div className="text-center py-8">Loading exercises...</div>;
  }

  if (error) {
    return <div className="text-destructive text-center py-8">Error: {error}</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Exercise Library</h2>
        <p className="text-muted-foreground">
          {filteredExercises.length} exercise{filteredExercises.length !== 1 ? 's' : ''} available
          {filteredExercises.length !== exercises.length && ` (filtered from ${exercises.length} total)`}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-8 items-center">
        <SearchInput value={search} onChange={setSearch} />
        <ExerciseFilters
          selectedMuscle={selectedMuscle}
          selectedLevel={selectedLevel}
          selectedCategory={selectedCategory}
          onMuscleChange={setSelectedMuscle}
          onLevelChange={setSelectedLevel}
          onCategoryChange={setSelectedCategory}
          onCreateClick={() => setShowCreateDialog(true)}
        />
      </div>

      <ExerciseGrid
        exercises={filteredExercises}
        currentPage={currentPage}
        exercisesPerPage={exercisesPerPage}
        onPageChange={setCurrentPage}
        onExerciseClick={setSelectedExercise}
      />

      <ExerciseDetailModal
        exercise={selectedExercise}
        onClose={() => setSelectedExercise(null)}
      />

      {showCreateDialog && (
        <Suspense fallback={null}>
          <CreateExerciseDialog
            open={showCreateDialog}
            onClose={() => setShowCreateDialog(false)}
            onSuccess={() => {
              // Refresh the page to show the new exercise
              window.location.reload();
            }}
          />
        </Suspense>
      )}
    </div>
  );
}

