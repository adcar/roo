export interface Exercise {
  id: string;
  name: string;
  description?: string;
  force: "pull" | "push" | "static" | null;
  level: "beginner" | "intermediate" | "expert";
  mechanic: "compound" | "isolation" | null;
  equipment: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: "strength" | "stretching" | "plyometrics" | "strongman" | "powerlifting" | "cardio" | "olympic weightlifting";
  images: string[];
  isCustom?: boolean;
}

export interface ProgramExercise {
  exerciseId: string;
  sets?: number;
  reps?: number;
  weight?: number;
  distance?: number; // Distance in miles for cardio exercises
  notes?: string;
  order?: number; // Explicit order field for database storage
}

export interface WorkoutDay {
  id: string;
  name: string; // e.g., "Leg Day", "Pull Day", "Chest Day"
  weekA: ProgramExercise[];
  weekB: ProgramExercise[];
}

export interface Program {
  id: string;
  name: string;
  days: WorkoutDay[];
  isSplit?: boolean; // If true, program alternates between week A and B. Defaults to true for backward compatibility
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
  distance?: number; // Distance in miles for cardio exercises
  repWeights?: number[];
  completed: boolean;
}
