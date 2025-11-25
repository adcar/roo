'use client';

import { memo } from 'react';
import Image from 'next/image';
import { Exercise } from '@/types/exercise';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2 } from 'lucide-react';

export const ExerciseCard = memo(function ExerciseCard({ 
  exercise, 
  onClick,
  onEdit,
  onDelete,
}: { 
  exercise: Exercise & { isCustom?: boolean }; 
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const isCustom = exercise.isCustom;
  
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-all py-0 relative"
      onClick={onClick}
    >
      <CardHeader className="p-0 relative">
        {isCustom && (
          <Badge className="absolute top-2 right-2 z-10 bg-primary text-primary-foreground">
            Custom
          </Badge>
        )}
        {(onEdit || onDelete) && (
          <div className="absolute top-2 left-2 z-10 flex gap-1">
            {onEdit && (
              <Button
                size="sm"
                variant="secondary"
                className="h-7 w-7 p-0"
                onClick={handleEdit}
                title="Edit exercise"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="destructive"
                className="h-7 w-7 p-0"
                onClick={handleDelete}
                title="Delete exercise"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
        {exercise.images[0] && (
          <div className="relative w-full h-40 rounded-t-lg overflow-hidden bg-muted">
            <Image
              src={`/exercise-images/${exercise.images[0]}`}
              alt={exercise.name}
              fill
              className="object-cover"
              loading="lazy"
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="p-3">
        <CardTitle className="text-sm mb-2 line-clamp-2">{exercise.name}</CardTitle>
        <div className="flex flex-wrap gap-1 mb-2">
          {exercise.primaryMuscles.slice(0, 2).map(muscle => (
            <Badge key={muscle} variant="secondary" className="text-xs">{muscle}</Badge>
          ))}
        </div>
        <CardDescription className="capitalize text-xs">
          {exercise.level}
        </CardDescription>
      </CardContent>
    </Card>
  );
});

