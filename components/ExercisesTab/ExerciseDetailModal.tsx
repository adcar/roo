'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Exercise } from '@/types/exercise';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Model, { IExerciseData, Muscle } from 'react-body-highlighter';
import { mapMuscleName } from './utils';

interface ExerciseDetailModalProps {
  exercise: Exercise | null;
  themeColors: string[];
  onClose: () => void;
}

export function ExerciseDetailModal({ exercise, themeColors, onClose }: ExerciseDetailModalProps) {
  const [clickedMuscle, setClickedMuscle] = useState<{ muscle: string; view: 'anterior' | 'posterior' } | null>(null);
  const [highlightedMuscle, setHighlightedMuscle] = useState<string | null>(null);

  const exerciseData = useMemo((): IExerciseData[] => {
    if (!exercise) return [];
    
    const primaryMuscles = exercise.primaryMuscles
      .map(mapMuscleName)
      .filter((m): m is Muscle => m !== null);
    
    const secondaryMuscles = exercise.secondaryMuscles
      .map(mapMuscleName)
      .filter((m): m is Muscle => m !== null)
      .filter(m => !primaryMuscles.includes(m));

    const data: IExerciseData[] = [];
    
    if (primaryMuscles.length > 0) {
      data.push({ name: exercise.name, muscles: primaryMuscles });
    }
    
    if (secondaryMuscles.length > 0) {
      data.push({ name: `${exercise.name} (secondary)`, muscles: secondaryMuscles });
      data.push({ name: `${exercise.name} (secondary)`, muscles: secondaryMuscles });
    }

    if (highlightedMuscle) {
      const mappedHighlighted = mapMuscleName(highlightedMuscle);
      if (mappedHighlighted) {
        for (let i = 0; i < 3; i++) {
          data.push({ name: `${exercise.name} (highlighted)`, muscles: [mappedHighlighted] });
        }
      }
    }
    
    return data;
  }, [exercise, highlightedMuscle]);

  const needsBackView = useMemo(() => {
    if (!exercise) return false;
    const backMuscles = ['lats', 'middle back', 'lower back', 'traps'];
    return [...exercise.primaryMuscles, ...exercise.secondaryMuscles].some(
      m => backMuscles.includes(m.toLowerCase())
    );
  }, [exercise]);

  if (!exercise) return null;

  return (
    <Dialog open={!!exercise} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{exercise.name}</DialogTitle>
        </DialogHeader>

        {/* Exercise Images */}
        {exercise.images.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {exercise.images.map((img, idx) => (
              <div key={idx} className="relative w-full h-48 rounded-lg overflow-hidden bg-muted">
                <Image
                  src={`/exercise-images/${img}`}
                  alt={`${exercise.name} ${idx + 1}`}
                  fill
                  className="object-contain"
                />
              </div>
            ))}
          </div>
        )}

        {/* Muscles Worked Section */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Muscles Worked</h3>
          
          <div className="flex flex-col md:flex-row items-start gap-4">
            {/* Body Models */}
            <div className="flex-shrink-0 flex gap-3">
              {/* Front View */}
              <div>
                <div className="text-xs text-muted-foreground mb-1 text-center">Front</div>
                <div className="relative">
                  <Model
                    data={exerciseData}
                    highlightedColors={themeColors}
                    style={{ width: '150px', height: '210px' }}
                    bodyColor="#e5e7eb"
                    type="anterior"
                    onClick={(muscleStats: any) => {
                      const clickedMuscleName = muscleStats.muscle || muscleStats.name;
                      const muscleName = [...exercise.primaryMuscles, ...exercise.secondaryMuscles].find(
                        m => {
                          const mapped = mapMuscleName(m);
                          return mapped === clickedMuscleName || mapped === clickedMuscleName.toLowerCase();
                        }
                      );
                      if (muscleName) {
                        setClickedMuscle({ muscle: muscleName, view: 'anterior' });
                        setTimeout(() => setClickedMuscle(null), 2000);
                      }
                    }}
                  />
                  {clickedMuscle && clickedMuscle.view === 'anterior' && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                      {clickedMuscle.muscle}
                    </div>
                  )}
                </div>
              </div>
              {/* Back View */}
              {needsBackView && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1 text-center">Back</div>
                  <div className="relative">
                    <Model
                      data={exerciseData}
                      highlightedColors={themeColors}
                      style={{ width: '150px', height: '210px' }}
                      bodyColor="#e5e7eb"
                      type="posterior"
                      onClick={(muscleStats: any) => {
                        const clickedMuscleName = muscleStats.muscle || muscleStats.name;
                        const muscleName = [...exercise.primaryMuscles, ...exercise.secondaryMuscles].find(
                          m => {
                            const mapped = mapMuscleName(m);
                            return mapped === clickedMuscleName || mapped === clickedMuscleName.toLowerCase();
                          }
                        );
                        if (muscleName) {
                          setClickedMuscle({ muscle: muscleName, view: 'posterior' });
                          setTimeout(() => setClickedMuscle(null), 2000);
                        }
                      }}
                    />
                    {clickedMuscle && clickedMuscle.view === 'posterior' && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                        {clickedMuscle.muscle}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Muscle List */}
            <div className="flex-1">
              <div className="space-y-3">
                {exercise.primaryMuscles.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-3 h-3 rounded bg-primary"></div>
                      <span className="text-xs font-medium text-muted-foreground">Primary</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {exercise.primaryMuscles.map(muscle => {
                        const mappedMuscle = mapMuscleName(muscle);
                        const isHighlighted = highlightedMuscle === muscle && mappedMuscle;
                        return (
                          <Badge 
                            key={muscle} 
                            className={`${isHighlighted ? 'bg-green-500 hover:bg-green-600 ring-2 ring-green-300' : 'bg-primary text-primary-foreground hover:bg-primary/90'} border-0 text-xs cursor-pointer transition-all`}
                            onClick={() => setHighlightedMuscle(highlightedMuscle === muscle ? null : muscle)}
                          >
                            {muscle}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
                {exercise.secondaryMuscles.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-3 h-3 rounded bg-secondary"></div>
                      <span className="text-xs font-medium text-muted-foreground">Secondary</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {exercise.secondaryMuscles.map(muscle => {
                        const mappedMuscle = mapMuscleName(muscle);
                        const isHighlighted = highlightedMuscle === muscle && mappedMuscle;
                        return (
                          <Badge 
                            key={muscle} 
                            className={`${isHighlighted ? 'bg-green-500 hover:bg-green-600 ring-2 ring-green-300' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'} border-0 text-xs cursor-pointer transition-all`}
                            onClick={() => setHighlightedMuscle(highlightedMuscle === muscle ? null : muscle)}
                          >
                            {muscle}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Instructions */}
        {exercise.instructions.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Instructions</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              {exercise.instructions.map((instruction, idx) => (
                <li key={idx}>{instruction}</li>
              ))}
            </ol>
          </div>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Level: {exercise.level}</Badge>
          <Badge variant="secondary">Equipment: {exercise.equipment}</Badge>
          <Badge variant="secondary">Category: {exercise.category}</Badge>
        </div>
      </DialogContent>
    </Dialog>
  );
}

