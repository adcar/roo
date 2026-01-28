'use client';

import { Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GripVertical, X, Link, Unlink } from 'lucide-react';
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
  isInSuperset,
  isFirstInSuperset,
  isLastInSuperset,
  supersetSize,
  onLinkWithNext,
  onUnlinkSuperset,
  canLinkWithNext,
}: SortableExerciseItemProps) {
  const draggableId = `${dayId}-${week}-${index}`;
  const isCardio = getExerciseCategory(exercise.exerciseId) === 'cardio';

  // Determine superset label (A, B, C, etc. within the superset)
  const getSupersetLabel = () => {
    if (!isInSuperset || supersetSize === undefined) return null;
    // This will be calculated by the parent based on position in superset
    return null;
  };

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
            className={`relative ${
              snapshot.isDragging ? 'shadow-lg opacity-90 z-50' : ''
            }`}
          >
            {/* Superset visual grouping */}
            <div className={`
              bg-muted/50 rounded border transition-colors
              ${isInSuperset 
                ? 'border-primary/50 bg-primary/5' 
                : 'border-border'
              }
              ${isFirstInSuperset ? 'rounded-b-none border-b-0' : ''}
              ${isLastInSuperset ? 'rounded-t-none' : ''}
              ${isInSuperset && !isFirstInSuperset && !isLastInSuperset ? 'rounded-none border-b-0' : ''}
            `}>
              <div className="flex items-center gap-2 p-2">
                <div
                  {...provided.dragHandleProps}
                  className="flex-shrink-0 text-muted-foreground cursor-grab active:cursor-grabbing"
                >
                  <GripVertical className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      {isInSuperset && (
                        <span className="flex-shrink-0 text-xs font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          SS
                        </span>
                      )}
                      <span className="font-medium text-sm truncate">
                        {getExerciseName(exercise.exerciseId)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isInSuperset && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUnlinkSuperset?.();
                          }}
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Remove from superset"
                        >
                          <Unlink className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeExercise(dayId, week, index);
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
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

            {/* Link button between exercises */}
            {canLinkWithNext && !snapshot.isDragging && (
              <div className="relative h-0 z-10">
                <div className="absolute left-1/2 -translate-x-1/2 -bottom-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLinkWithNext?.();
                    }}
                    className={`h-6 w-6 p-0 rounded-full border-2 bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors ${
                      isInSuperset && !isLastInSuperset 
                        ? 'border-primary bg-primary text-primary-foreground' 
                        : 'border-muted-foreground/30'
                    }`}
                    title={isInSuperset && !isLastInSuperset ? "Already in superset" : "Link as superset with next exercise"}
                  >
                    <Link className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      }}
    </Draggable>
  );
}
