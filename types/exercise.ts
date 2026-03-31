export interface Exercise {
  id: string;
  name: string;
  description?: string;
  force: 'pull' | 'push' | 'static' | null;
  level: 'beginner' | 'intermediate' | 'expert';
  mechanic: 'compound' | 'isolation' | null;
  equipment: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: 'strength' | 'stretching' | 'plyometrics' | 'strongman' | 'powerlifting' | 'cardio' | 'olympic weightlifting';
  images: string[];
  isCustom?: boolean;
}

export interface ProgramExercise {
  exerciseId: string;
  sets?: number;
  reps?: number;
  weight?: number;
  distance?: number;
  notes?: string;
  order?: number;
  supersetId?: string;
}

export interface WorkoutDay {
  id: string;
  name: string;
  weekA: ProgramExercise[];
  weekB: ProgramExercise[];
}

export interface Program {
  id: string;
  name: string;
  days: WorkoutDay[];
  isSplit?: boolean;
  durationWeeks?: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutLog {
  id?: string;
  programId: string;
  dayId: string;
  week: 'A' | 'B';
  date: string;
  exercises: ExerciseLog[];
}

export interface ExerciseLog {
  exerciseId: string;
  sets: SetLog[];
}

export interface SetLog {
  reps?: number;
  weight?: number;
  distance?: number;
  repWeights?: number[];
  completed: boolean;
}
