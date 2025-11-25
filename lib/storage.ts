import { Program } from '@/types/exercise';

const PROGRAMS_KEY = 'workout-programs';

export const storage = {
  getPrograms: (): Program[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(PROGRAMS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveProgram: (program: Program): void => {
    if (typeof window === 'undefined') return;
    const programs = storage.getPrograms();
    const existingIndex = programs.findIndex(p => p.id === program.id);

    if (existingIndex >= 0) {
      programs[existingIndex] = { ...program, updatedAt: new Date().toISOString() };
    } else {
      programs.push(program);
    }

    localStorage.setItem(PROGRAMS_KEY, JSON.stringify(programs));
  },

  deleteProgram: (programId: string): void => {
    if (typeof window === 'undefined') return;
    const programs = storage.getPrograms();
    const filtered = programs.filter(p => p.id !== programId);
    localStorage.setItem(PROGRAMS_KEY, JSON.stringify(filtered));
  },

  getProgram: (programId: string): Program | null => {
    const programs = storage.getPrograms();
    return programs.find(p => p.id === programId) || null;
  }
};
