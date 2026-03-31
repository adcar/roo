import type { Muscle } from 'react-body-highlighter';

export function mapMuscleName(muscle: string): Muscle | null {
  const mapping: Record<string, Muscle> = {
    'chest': 'chest',
    'biceps': 'biceps',
    'triceps': 'triceps',
    'forearms': 'forearm',
    'shoulders': 'front-deltoids',
    'abdominals': 'abs',
    'quadriceps': 'quadriceps',
    'hamstrings': 'hamstring',
    'calves': 'calves',
    'glutes': 'gluteal',
    'lats': 'upper-back',
    'lower back': 'lower-back',
    'middle back': 'upper-back',
    'traps': 'trapezius',
    'adductors': 'adductor',
    'abductors': 'abductors',
  };
  return mapping[muscle.toLowerCase()] || null;
}
