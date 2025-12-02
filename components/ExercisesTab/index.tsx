'use client';

import { useState, useMemo, lazy, Suspense } from 'react';
import { useExercises, filterExercises } from '@/hooks/useExercises';
import { useAvailableEquipment } from '@/hooks/useAvailableEquipment';
import { Exercise } from '@/types/exercise';
import { SearchInput } from './SearchInput';
import { ExerciseFilters } from './ExerciseFilters';
import { ExerciseGrid } from './ExerciseGrid';
import { ExerciseDetailModal } from './ExerciseDetailModal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';

// Lazy load the CreateExerciseDialog to avoid loading it until needed
const CreateExerciseDialog = lazy(() => import('./CreateExerciseDialog').then(module => ({ default: module.CreateExerciseDialog })));

export default function ExercisesTab() {
  const { exercises, loading, error, refetch } = useExercises();
  const { availableEquipment } = useAvailableEquipment();
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('builtin');
  const [equipmentFilterEnabled, setEquipmentFilterEnabled] = useState(true);
  const exercisesPerPage = 20;

  // Separate exercises into default and custom
  const defaultExercises = useMemo(() => {
    return exercises.filter(ex => !ex.isCustom);
  }, [exercises]);

  const customExercises = useMemo(() => {
    return exercises.filter(ex => ex.isCustom);
  }, [exercises]);

  // Get exercises based on active tab
  const tabExercises = useMemo(() => {
    return activeTab === 'custom' ? customExercises : defaultExercises;
  }, [activeTab, defaultExercises, customExercises]);

  const filteredExercises = useMemo(() => {
    return filterExercises(tabExercises, {
      search: search || undefined,
      primaryMuscle: selectedMuscle && selectedMuscle !== 'all' ? selectedMuscle : undefined,
      level: selectedLevel && selectedLevel !== 'all' ? selectedLevel : undefined,
      category: selectedCategory && selectedCategory !== 'all' ? selectedCategory : undefined,
      availableEquipment: equipmentFilterEnabled && availableEquipment && availableEquipment.length > 0 ? availableEquipment : undefined,
    });
  }, [tabExercises, search, selectedMuscle, selectedLevel, selectedCategory, equipmentFilterEnabled, availableEquipment]);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [search, selectedMuscle, selectedLevel, selectedCategory, activeTab, equipmentFilterEnabled]);

  if (loading) {
    return <div className="text-center py-8">Loading exercises...</div>;
  }

  if (error) {
    return <div className="text-destructive text-center py-8">Error: {error}</div>;
  }

  const handleDeleteClick = (exerciseId: string) => {
    const exercise = exercises.find(ex => ex.id === exerciseId);
    if (exercise) {
      setExerciseToDelete(exercise);
    }
  };

  const confirmDeleteExercise = async () => {
    if (!exerciseToDelete?.id) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/custom-exercises/${exerciseToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete exercise');
      }

      await refetch();
      setSelectedExercise(null);
      setExerciseToDelete(null);
    } catch (error) {
      console.error('Error deleting exercise:', error);
      alert('Failed to delete exercise. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Exercise Library</h2>
        <p className="text-muted-foreground">
          {filteredExercises.length} exercise{filteredExercises.length !== 1 ? 's' : ''} available
          {filteredExercises.length !== tabExercises.length && ` (filtered from ${tabExercises.length} total)`}
        </p>
      </div>

      {equipmentFilterEnabled && availableEquipment && availableEquipment.length > 0 && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs">
            Filtering by your equipment
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEquipmentFilterEnabled(false)}
            className="h-7 px-2 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Show all exercises
          </Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <div className="flex flex-wrap gap-2 mb-8 items-center justify-between">
          <TabsList>
            <TabsTrigger value="builtin">Built-in Exercises ({defaultExercises.length})</TabsTrigger>
            <TabsTrigger value="custom">Custom Exercises ({customExercises.length})</TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap gap-2 items-center">
            <SearchInput value={search} onChange={setSearch} />
            <ExerciseFilters
              selectedMuscle={selectedMuscle}
              selectedLevel={selectedLevel}
              selectedCategory={selectedCategory}
              onMuscleChange={setSelectedMuscle}
              onLevelChange={setSelectedLevel}
              onCategoryChange={setSelectedCategory}
              onCreateClick={() => {
                setEditingExercise(null);
                setShowCreateDialog(true);
              }}
            />
          </div>
        </div>

        <TabsContent value="builtin" className="mt-0">
          <ExerciseGrid
            exercises={filteredExercises}
            currentPage={currentPage}
            exercisesPerPage={exercisesPerPage}
            onPageChange={setCurrentPage}
            onExerciseClick={setSelectedExercise}
            searchQuery={search}
          />
        </TabsContent>

        <TabsContent value="custom" className="mt-0">
          {customExercises.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="text-center max-w-md">
                <h3 className="text-xl font-semibold mb-2">No Custom Exercises Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create your own custom exercises to add them to your workout programs. 
                  You can define the muscles worked, equipment needed, and add your own images.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingExercise(null);
                    setShowCreateDialog(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Custom Exercise
                </Button>
              </div>
            </div>
          ) : (
            <ExerciseGrid
              exercises={filteredExercises}
              currentPage={currentPage}
              exercisesPerPage={exercisesPerPage}
              onPageChange={setCurrentPage}
              onExerciseClick={setSelectedExercise}
              onEditClick={(exercise) => {
                setEditingExercise(exercise);
                setShowCreateDialog(true);
              }}
              onDeleteClick={handleDeleteClick}
              showActions={true}
              searchQuery={search}
            />
          )}
        </TabsContent>
      </Tabs>

      <ExerciseDetailModal
        exercise={selectedExercise}
        onClose={() => setSelectedExercise(null)}
        onEdit={(exercise) => {
          if (exercise.isCustom) {
            setEditingExercise(exercise);
            setShowCreateDialog(true);
          }
        }}
        onDelete={(exerciseId) => {
          handleDeleteClick(exerciseId);
        }}
      />

      {showCreateDialog && (
        <Suspense fallback={null}>
          <CreateExerciseDialog
            open={showCreateDialog}
            onClose={() => {
              setShowCreateDialog(false);
              setEditingExercise(null);
            }}
            exercise={editingExercise}
            onSuccess={async () => {
              await refetch();
              setEditingExercise(null);
            }}
          />
        </Suspense>
      )}

      <Dialog open={!!exerciseToDelete} onOpenChange={(open) => !open && setExerciseToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Custom Exercise</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{exerciseToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setExerciseToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteExercise}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

