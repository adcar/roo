'use client';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { ALL_MUSCLE_OPTIONS } from './utils';

interface ExerciseFiltersProps {
  selectedMuscle: string;
  selectedLevel: string;
  selectedCategory: string;
  onMuscleChange: (value: string) => void;
  onLevelChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onCreateClick: () => void;
}

export function ExerciseFilters({
  selectedMuscle,
  selectedLevel,
  selectedCategory,
  onMuscleChange,
  onLevelChange,
  onCategoryChange,
  onCreateClick,
}: ExerciseFiltersProps) {
  return (
    <>
      <Select value={selectedMuscle} onValueChange={onMuscleChange}>
        <SelectTrigger className="min-w-[150px]">
          <SelectValue placeholder="All Muscles" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Muscles</SelectItem>
          {ALL_MUSCLE_OPTIONS.map(muscle => (
            <SelectItem key={muscle} value={muscle}>{muscle}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedLevel} onValueChange={onLevelChange}>
        <SelectTrigger className="min-w-[150px]">
          <SelectValue placeholder="All Levels" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Levels</SelectItem>
          <SelectItem value="beginner">Beginner</SelectItem>
          <SelectItem value="intermediate">Intermediate</SelectItem>
          <SelectItem value="expert">Expert</SelectItem>
        </SelectContent>
      </Select>

      <Select value={selectedCategory} onValueChange={onCategoryChange}>
        <SelectTrigger className="min-w-[150px]">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          <SelectItem value="strength">Strength</SelectItem>
          <SelectItem value="stretching">Stretching</SelectItem>
          <SelectItem value="plyometrics">Plyometrics</SelectItem>
          <SelectItem value="cardio">Cardio</SelectItem>
        </SelectContent>
      </Select>

      <Button onClick={onCreateClick} className="gap-2">
        <Plus className="h-4 w-4" />
        Create Custom Exercise
      </Button>
    </>
  );
}

