'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { X } from 'lucide-react';
import { WorkoutDay } from '@/types/exercise';
import WeekColumn from './WeekColumn';

interface DayTabsProps {
  days: WorkoutDay[];
  activeTab: string;
  onTabChange: (value: string) => void;
  onDeleteClick: (dayId: string) => void;
  getExerciseName: (id: string) => string;
  updateExercise: (dayId: string, week: 'A' | 'B', index: number, updates: any) => void;
  removeExercise: (dayId: string, week: 'A' | 'B', index: number) => void;
  onAddExercise: (dayId: string, week: 'A' | 'B') => void;
}

export default function DayTabs({
  days,
  activeTab,
  onTabChange,
  onDeleteClick,
  getExerciseName,
  updateExercise,
  removeExercise,
  onAddExercise,
}: DayTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <TabsList>
          {days.map(day => (
            <TabsTrigger key={day.id} value={day.id} className="relative group pr-6">
              {day.name}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onDeleteClick(day.id);
                }}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 p-0 flex items-center justify-center rounded-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted text-muted-foreground hover:text-destructive cursor-pointer"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    e.preventDefault();
                    onDeleteClick(day.id);
                  }
                }}
              >
                <X className="h-3 w-3" />
              </div>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {days.map(day => {
        const weekAIds = day.weekA.map((_, idx) => `${day.id}-A-${idx}`);
        const weekBIds = day.weekB.map((_, idx) => `${day.id}-B-${idx}`);
        
        return (
          <TabsContent key={day.id} value={day.id}>
            <Card>
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-4">
                  {(['A', 'B'] as const).map(week => {
                    const exercises = day[week === 'A' ? 'weekA' : 'weekB'];
                    const weekIds = week === 'A' ? weekAIds : weekBIds;
                    
                    return (
                      <WeekColumn
                        key={week}
                        dayId={day.id}
                        week={week}
                        exercises={exercises}
                        weekIds={weekIds}
                        getExerciseName={getExerciseName}
                        updateExercise={updateExercise}
                        removeExercise={removeExercise}
                        onAddExercise={() => onAddExercise(day.id, week)}
                      />
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

