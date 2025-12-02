'use client';

import { useState, useEffect, useCallback } from 'react';
import { Exercise } from '@/types/exercise';
import { exerciseMatchesSearch } from '@/utils/searchUtils';

export function useExercises() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExercises = useCallback(async () => {
    try {
      setLoading(true);
      const [defaultExercises, customExercises] = await Promise.all([
        fetch('/exercises.json').then(res => res.json()),
        fetch('/api/custom-exercises').then(res => res.json()).catch(() => [])
      ]);
      
      // Mark custom exercises and combine
      const allExercises = [
        ...defaultExercises,
        ...customExercises.map((ex: any) => ({ ...ex, isCustom: true }))
      ];
      setExercises(allExercises);
      setLoading(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exercises');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  return { exercises, loading, error, refetch: fetchExercises };
}

export function filterExercises(
  exercises: Exercise[],
  filters: {
    search?: string;
    primaryMuscle?: string;
    equipment?: string;
    level?: string;
    category?: string;
    availableEquipment?: string[] | null; // Array of equipment user has available
  }
) {
  // Early return if no filters
  if (!filters.search && !filters.primaryMuscle && !filters.equipment && !filters.level && !filters.category && !filters.availableEquipment) {
    return exercises;
  }
  
  return exercises.filter(exercise => {
    if (filters.search && !exerciseMatchesSearch(exercise.name, filters.search)) {
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
    // Filter by available equipment: show exercises that use equipment in the list, or null/body only/other
    if (filters.availableEquipment && filters.availableEquipment.length > 0) {
      const exerciseEquipment = exercise.equipment?.toLowerCase() || null;
      const hasEquipment = exerciseEquipment === null || 
                          exerciseEquipment === 'body only' ||
                          exerciseEquipment === 'other' ||
                          filters.availableEquipment.some(eq => eq.toLowerCase() === exerciseEquipment);
      if (!hasEquipment) {
        return false;
      }
    }
    return true;
  });
}
