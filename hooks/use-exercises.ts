'use client';

import { useState, useEffect } from 'react';
import type { Exercise } from '@/types/exercise';

let cachedExercises: Exercise[] | null = null;

export function useExercises() {
  const [exercises, setExercises] = useState<Exercise[]>(cachedExercises || []);
  const [loading, setLoading] = useState(!cachedExercises);

  useEffect(() => {
    if (cachedExercises) return;

    Promise.all([
      fetch('/exercises.json').then(r => r.json()),
      fetch('/api/custom-exercises').then(r => r.json()).catch(() => []),
    ]).then(([builtIn, custom]) => {
      const all = [...(Array.isArray(builtIn) ? builtIn : []), ...(Array.isArray(custom) ? custom : [])];
      cachedExercises = all;
      setExercises(all);
      setLoading(false);
    });
  }, []);

  return { exercises, loading };
}
