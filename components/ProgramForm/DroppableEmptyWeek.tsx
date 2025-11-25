'use client';

import { Droppable } from '@hello-pangea/dnd';
import { DroppableEmptyWeekProps } from './types';

export default function DroppableEmptyWeek({ dayId, week }: DroppableEmptyWeekProps) {
  const droppableId = `empty-${dayId}-${week}`;

  return (
    <Droppable droppableId={droppableId}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`min-h-[60px] rounded border-2 border-dashed flex items-center justify-center transition-colors ${
            snapshot.isDraggingOver
              ? 'border-primary bg-primary/10'
              : 'border-muted-foreground/30'
          }`}
        >
          <p className="text-muted-foreground text-sm">
            {snapshot.isDraggingOver ? 'Drop exercise here' : 'No exercises added'}
          </p>
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}
