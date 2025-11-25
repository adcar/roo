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
  updateExercise,
  removeExercise,
  onAddExercise,
}: WeekColumnProps) {
  const droppableId = `${dayId}-${week}`;

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
                {exercises.map((exercise, idx) => (
                  <div key={`${dayId}-${week}-${idx}`} className={idx > 0 ? 'mt-4' : ''}>
                    <SortableExerciseItem
                      exercise={exercise}
                      dayId={dayId}
                      week={week}
                      index={idx}
                      getExerciseName={getExerciseName}
                      updateExercise={updateExercise}
                      removeExercise={removeExercise}
                    />
                  </div>
                ))}
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
