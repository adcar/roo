'use client';

import { Droppable } from '@hello-pangea/dnd';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Plus } from 'lucide-react';
import SortableExerciseItem from './SortableExerciseItem';
import DroppableEmptyWeek from './DroppableEmptyWeek';
import { WeekColumnProps } from './types';

export default function WeekColumn({
  dayId,
  week,
  exercises,
  weekIds,
  getExerciseName,
  getExerciseCategory,
  updateExercise,
  removeExercise,
  onAddExercise,
  onLinkExercises,
  onUnlinkExercise,
}: WeekColumnProps) {
  const droppableId = `${dayId}-${week}`;

  // Helper to get superset info for an exercise
  const getSupersetInfo = (index: number) => {
    const exercise = exercises[index];
    if (!exercise.supersetId) {
      return {
        isInSuperset: false,
        isFirstInSuperset: false,
        isLastInSuperset: false,
        supersetSize: 0,
      };
    }

    // Find all exercises in this superset
    const supersetExercises = exercises
      .map((ex, idx) => ({ ex, idx }))
      .filter(({ ex }) => ex.supersetId === exercise.supersetId);
    
    const positionInSuperset = supersetExercises.findIndex(({ idx }) => idx === index);
    
    return {
      isInSuperset: true,
      isFirstInSuperset: positionInSuperset === 0,
      isLastInSuperset: positionInSuperset === supersetExercises.length - 1,
      supersetSize: supersetExercises.length,
    };
  };

  // Check if this exercise can be linked with the next one
  const canLinkWithNext = (index: number) => {
    if (index >= exercises.length - 1) return false;
    
    const current = exercises[index];
    const next = exercises[index + 1];
    
    // If both are in the same superset and adjacent, they're already linked
    if (current.supersetId && current.supersetId === next.supersetId) {
      return true; // Show as linked
    }
    
    return true; // Can always link with next
  };

  // Check if linking action should link or is already linked
  const isLinkedWithNext = (index: number) => {
    if (index >= exercises.length - 1) return false;
    
    const current = exercises[index];
    const next = exercises[index + 1];
    
    return current.supersetId !== undefined && current.supersetId === next.supersetId;
  };

  return (
    <Droppable droppableId={droppableId}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`space-y-3 ${snapshot.isDraggingOver ? 'bg-muted/30 rounded' : ''}`}
        >
          <div className="flex justify-between items-center">
            <Badge variant="secondary" className="text-base px-3 py-1">Week {week}</Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={onAddExercise}
            >
              <Plus className="mr-2 h-3 w-3" />
              Add Exercise
            </Button>
          </div>

          <Separator />

          <div>
            {exercises.length === 0 ? (
              <DroppableEmptyWeek dayId={dayId} week={week} />
            ) : (
              <>
                {exercises.map((exercise, idx) => {
                  const supersetInfo = getSupersetInfo(idx);
                  const linkedWithNext = isLinkedWithNext(idx);
                  
                  return (
                    <div 
                      key={`${dayId}-${week}-${idx}`} 
                      className={`${idx > 0 && !supersetInfo.isInSuperset ? 'mt-4' : ''} ${idx > 0 && supersetInfo.isInSuperset && !supersetInfo.isFirstInSuperset ? 'mt-0' : ''} ${idx > 0 && !linkedWithNext && exercises[idx - 1]?.supersetId && exercises[idx - 1]?.supersetId !== exercise.supersetId ? 'mt-4' : ''}`}
                    >
                      <SortableExerciseItem
                        exercise={exercise}
                        dayId={dayId}
                        week={week}
                        index={idx}
                        getExerciseName={getExerciseName}
                        getExerciseCategory={getExerciseCategory}
                        updateExercise={updateExercise}
                        removeExercise={removeExercise}
                        isInSuperset={supersetInfo.isInSuperset}
                        isFirstInSuperset={supersetInfo.isFirstInSuperset}
                        isLastInSuperset={supersetInfo.isLastInSuperset}
                        supersetSize={supersetInfo.supersetSize}
                        canLinkWithNext={idx < exercises.length - 1}
                        onLinkWithNext={() => onLinkExercises(dayId, week, idx, idx + 1)}
                        onUnlinkSuperset={() => onUnlinkExercise(dayId, week, idx)}
                      />
                    </div>
                  );
                })}
                {provided.placeholder && (
                  <div className="mt-4">
                    {provided.placeholder}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </Droppable>
  );
}
