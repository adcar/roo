'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { X, Plus, Pencil } from 'lucide-react';
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
  onAddDay: (name: string) => void;
  onUpdateDayName: (dayId: string, newName: string) => void;
  newDayName: string;
  onNewDayNameChange: (name: string) => void;
  isSplit?: boolean;
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
  onAddDay,
  onUpdateDayName,
  newDayName,
  onNewDayNameChange,
  isSplit = true,
}: DayTabsProps) {
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [editingDayName, setEditingDayName] = useState('');
  
  const handleAddDay = () => {
    if (newDayName.trim()) {
      onAddDay(newDayName.trim());
    }
  };

  const handleStartEdit = (dayId: string, currentName: string) => {
    setEditingDayId(dayId);
    setEditingDayName(currentName);
  };

  const handleSaveEdit = (dayId: string) => {
    if (editingDayName.trim()) {
      onUpdateDayName(dayId, editingDayName.trim());
    }
    setEditingDayId(null);
    setEditingDayName('');
  };

  const handleCancelEdit = () => {
    setEditingDayId(null);
    setEditingDayName('');
  };

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="mb-6">
      <div className="mb-4">
        <TabsList className="!inline-flex !w-full !h-auto flex-wrap gap-2 p-1 items-stretch !justify-start">
            {days.map((day) => (
              <TabsTrigger 
                key={day.id}
                value={day.id} 
                className="relative group pr-8 md:pr-10 !flex-none !flex-initial !h-auto"
                onClick={(e) => {
                  if (editingDayId === day.id) {
                    e.preventDefault();
                  }
                }}
              >
              {editingDayId === day.id ? (
                <Input
                  value={editingDayName}
                  onChange={(e) => {
                    e.stopPropagation();
                    setEditingDayName(e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') {
                      handleSaveEdit(day.id);
                    } else if (e.key === 'Escape') {
                      handleCancelEdit();
                    }
                  }}
                  autoFocus
                  className="h-auto px-0 py-0 text-base md:text-sm border-0 shadow-none focus-visible:ring-0 bg-transparent min-w-[100px] max-w-[200px]"
                  onBlur={() => {
                    if (editingDayName.trim()) {
                      handleSaveEdit(day.id);
                    } else {
                      handleCancelEdit();
                    }
                  }}
                />
              ) : (
                <span className="flex-1 min-w-0 mr-6 md:mr-8 truncate block">{day.name}</span>
              )}
              {editingDayId !== day.id && (
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleStartEdit(day.id, day.name);
                    }}
                    className="h-6 w-6 md:h-5 md:w-5 p-0 flex items-center justify-center rounded-sm hover:bg-muted active:bg-muted text-muted-foreground hover:text-foreground cursor-pointer touch-manipulation"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        e.preventDefault();
                        handleStartEdit(day.id, day.name);
                      }
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5 md:h-3 md:w-3" />
                  </div>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onDeleteClick(day.id);
                    }}
                    className="h-6 w-6 md:h-5 md:w-5 p-0 flex items-center justify-center rounded-sm hover:bg-muted active:bg-muted text-muted-foreground hover:text-destructive cursor-pointer touch-manipulation"
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
                    <X className="h-3.5 w-3.5 md:h-3 md:w-3" />
                  </div>
                </div>
              )}
            </TabsTrigger>
          ))}
          <TabsTrigger 
            value="add-day" 
            className="text-muted-foreground !flex-none md:!flex-1 w-full md:w-auto"
            onClick={(e) => {
              if (activeTab === 'add-day') {
                e.preventDefault();
              }
            }}
          >
            {activeTab === 'add-day' ? (
              <Input
                value={newDayName}
                onChange={(e) => {
                  e.stopPropagation();
                  onNewDayNameChange(e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') {
                    handleAddDay();
                  } else if (e.key === 'Escape') {
                    onTabChange(days.length > 0 ? days[0].id : '');
                    onNewDayNameChange('');
                  }
                }}
                placeholder="Day name..."
                autoFocus
                className="h-auto w-full px-2 py-1 text-sm border-0 shadow-none focus-visible:ring-0 bg-transparent"
                onBlur={() => {
                  if (newDayName.trim()) {
                    handleAddDay();
                  } else {
                    onTabChange(days.length > 0 ? days[0].id : '');
                  }
                }}
              />
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" />
                Add Day
              </>
            )}
          </TabsTrigger>
        </TabsList>
      </div>
      
      {days.map(day => {
        const weekAIds = day.weekA.map((_, idx) => `${day.id}-A-${idx}`);
        const weekBIds = day.weekB.map((_, idx) => `${day.id}-B-${idx}`);
        
        return (
          <TabsContent key={day.id} value={day.id}>
            <Card>
              <CardContent className="pt-6">
                <div className={`grid gap-4 ${isSplit ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
                  {(['A', 'B'] as const).filter(week => isSplit || week === 'A').map(week => {
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
      
      <TabsContent value="add-day">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8">
              <p className="text-muted-foreground text-center mb-2">
                {days.length === 0 
                  ? 'Get started by adding your first workout day'
                  : 'Enter a name for the new workout day in the tab above'}
              </p>
              <p className="text-sm text-muted-foreground text-center">
                Press Enter to add, or Escape to cancel
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

