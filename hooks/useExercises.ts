'use client';

import { useState, useEffect } from 'react';
import { Exercise } from '@/types/exercise';

export function useExercises() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/exercises.json').then(res => res.json()),
      fetch('/api/custom-exercises').then(res => res.json()).catch(() => [])
    ])
      .then(([defaultExercises, customExercises]) => {
        // Mark custom exercises and combine
        const allExercises = [
          ...defaultExercises,
          ...customExercises.map((ex: any) => ({ ...ex, isCustom: true }))
        ];
        setExercises(allExercises);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { exercises, loading, error };
}

export function filterExercises(
  exercises: Exercise[],
  filters: {
    search?: string;
    primaryMuscle?: string;
    equipment?: string;
    level?: string;
    category?: string;
  }
) {
  // Early return if no filters
  if (!filters.search && !filters.primaryMuscle && !filters.equipment && !filters.level && !filters.category) {
    return exercises;
  }

  const searchLower = filters.search?.toLowerCase();
  
  return exercises.filter(exercise => {
    if (searchLower && !exercise.name.toLowerCase().includes(searchLower)) {
      return false;
    }
    if (filters.primaryMuscle && !exercise.primaryMuscles.includes(filters.primaryMuscle)) {
      return false;
    }
    if (filters.equipment && exercise.equipment !== filters.equipment) {
      return false;
    }
    if (filters.level && exercise.level !== filters.level) {
      return false;
    }
    if (filters.category && exercise.category !== filters.category) {
      return false;
    }
    return true;
  });
}
