'use client';

import { Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GripVertical, X } from 'lucide-react';
import { SortableExerciseItemProps } from './types';

export default function SortableExerciseItem({
  exercise,
  dayId,
  week,
  index,
  getExerciseName,
  getExerciseCategory,
  updateExercise,
  removeExercise,
}: SortableExerciseItemProps) {
  const draggableId = `${dayId}-${week}-${index}`;
  const isCardio = getExerciseCategory(exercise.exerciseId) === 'cardio';

  return (
    <Draggable draggableId={draggableId} index={index}>
      {(provided, snapshot) => {
        // Ensure no scaling happens - only preserve translate transforms
        const style = provided.draggableProps.style;
        let transform = style?.transform;
        if (transform && typeof transform === 'string') {
          // Remove any scale() from transform, keep only translate
          transform = transform.replace(/scale\([^)]+\)/g, '').trim();
        }
        
        return (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            style={{
              ...style,
              transform: transform || undefined,
            }}
            className={`bg-muted/50 rounded border border-border ${
              snapshot.isDragging ? 'shadow-lg opacity-90' : ''
            }`}
          >
          <div className="flex items-center gap-2 p-2">
            <div
              {...provided.dragHandleProps}
              className="flex-shrink-0 text-muted-foreground cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-medium text-sm truncate">
                  {getExerciseName(exercise.exerciseId)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeExercise(dayId, week, index);
                  }}
                  className="h-6 w-6 p-0 flex-shrink-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              {isCardio ? (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="number"
                      step="0.01"
                      value={exercise.distance || ''}
                      onChange={(e) => updateExercise(dayId, week, index, { distance: parseFloat(e.target.value) || 0 })}
                      placeholder="Distance (miles)"
                      className="h-7 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="number"
                      value={exercise.sets || ''}
                      onChange={(e) => updateExercise(dayId, week, index, { sets: parseInt(e.target.value) || 0 })}
                      placeholder="Sets"
                      className="h-7 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      type="number"
                      value={exercise.reps || ''}
                      onChange={(e) => updateExercise(dayId, week, index, { reps: parseInt(e.target.value) || 0 })}
                      placeholder="Reps"
                      className="h-7 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      type="number"
                      value={exercise.weight || ''}
                      onChange={(e) => updateExercise(dayId, week, index, { weight: parseInt(e.target.value) || 0 })}
                      placeholder="Weight"
                      className="h-7 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
          );
        }}
      </Draggable>
  );
}
