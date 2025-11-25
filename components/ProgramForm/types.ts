import { Program, ProgramExercise, WorkoutDay } from '@/types/exercise';

export interface ProgramFormProps {
  initialProgram?: Program;
  onSave: (program: Omit<Program, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  cancelUrl: string;
  title: string;
  saveButtonText?: string;
}

export interface SortableExerciseItemProps {
  exercise: ProgramExercise;
  dayId: string;
  week: 'A' | 'B';
  index: number;
  getExerciseName: (id: string) => string;
  updateExercise: (dayId: string, week: 'A' | 'B', index: number, updates: Partial<ProgramExercise>) => void;
  removeExercise: (dayId: string, week: 'A' | 'B', index: number) => void;
}

export interface DroppableEmptyWeekProps {
  dayId: string;
  week: 'A' | 'B';
}

export interface DragOverlayContentProps {
  activeId: string;
  days: WorkoutDay[];
  parseId: (id: string) => { dayId: string; week: 'A' | 'B'; index: number };
  getExerciseName: (id: string) => string;
}

export interface WeekColumnProps {
  dayId: string;
  week: 'A' | 'B';
  exercises: ProgramExercise[];
  weekIds: string[];
  getExerciseName: (id: string) => string;
  updateExercise: (dayId: string, week: 'A' | 'B', index: number, updates: Partial<ProgramExercise>) => void;
  removeExercise: (dayId: string, week: 'A' | 'B', index: number) => void;
  onAddExercise: () => void;
}

