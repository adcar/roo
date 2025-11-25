'use client';

import { memo } from 'react';
import Image from 'next/image';
import { Exercise } from '@/types/exercise';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const ExerciseCard = memo(function ExerciseCard({ 
  exercise, 
  onClick 
}: { 
  exercise: Exercise & { isCustom?: boolean }; 
  onClick: () => void;
}) {
  const isCustom = exercise.isCustom;
  return (
    <Card
      className={`cursor-pointer hover:shadow-lg transition-all py-0 ${isCustom ? 'border-2 border-primary ring-2 ring-primary/20' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="p-0 relative">
        {isCustom && (
          <Badge className="absolute top-2 right-2 z-10 bg-primary text-primary-foreground">
            Custom
          </Badge>
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

