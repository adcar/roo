'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import Model, { IExerciseData, Muscle } from 'react-body-highlighter';
import { X } from 'lucide-react';
import { ALL_MUSCLE_OPTIONS, mapMuscleName } from './utils';

interface CreateExerciseDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateExerciseDialog({ open, onClose, onSuccess }: CreateExerciseDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    primaryMuscles: [] as string[],
    secondaryMuscles: [] as string[],
    level: '',
    category: '',
    equipment: '',
    instructions: '',
    images: [] as File[],
  });
  const [muscleSelectorMode, setMuscleSelectorMode] = useState<'dropdown' | 'body'>('dropdown');
  const [highlightedMuscle, setHighlightedMuscle] = useState<string | null>(null);
  const [themeColors] = useState<string[]>(['#ef4444', '#f59e0b', '#10b981']);

  const exerciseData = useMemo((): IExerciseData[] => {
    if (!open) return [];
    const data: IExerciseData[] = [];
    
    const primaryMuscles = formData.primaryMuscles
      .map(mapMuscleName)
      .filter((m): m is Muscle => m !== null);
    
    const secondaryMuscles = formData.secondaryMuscles
      .map(mapMuscleName)
      .filter((m): m is Muscle => m !== null);
    
    if (primaryMuscles.length > 0) {
      data.push({ name: 'Exercise', muscles: primaryMuscles, frequency: 1 });
    }
    
    if (secondaryMuscles.length > 0) {
      data.push({ name: 'Exercise (secondary)', muscles: secondaryMuscles, frequency: 2 });
    }
    
    if (highlightedMuscle) {
      const mapped = mapMuscleName(highlightedMuscle);
      if (mapped) {
        data.push({ name: 'Exercise (highlighted)', muscles: [mapped], frequency: 3 });
      }
    }
    
    return data;
  }, [open, formData.primaryMuscles, formData.secondaryMuscles, highlightedMuscle]);

  const needsBackView = useMemo(() => {
    if (!open) return false;
    const backMuscles = ['lats', 'middle back', 'lower back', 'traps'];
    return [...formData.primaryMuscles, ...formData.secondaryMuscles].some(
      m => backMuscles.includes(m.toLowerCase())
    );
  }, [open, formData.primaryMuscles, formData.secondaryMuscles]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const newImages = [...formData.images];
      newImages[index] = file;
      setFormData({ ...formData, images: newImages });
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Name is required');
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append('name', formData.name);
    formDataToSend.append('description', formData.description);
    formDataToSend.append('primaryMuscles', JSON.stringify(formData.primaryMuscles));
    formDataToSend.append('secondaryMuscles', JSON.stringify(formData.secondaryMuscles));
    formDataToSend.append('level', formData.level);
    formDataToSend.append('category', formData.category);
    formDataToSend.append('equipment', formData.equipment);
    formDataToSend.append('instructions', formData.instructions);
    formData.images.forEach((img, idx) => {
      if (img) formDataToSend.append(`image${idx}`, img);
    });

    try {
      const response = await fetch('/api/custom-exercises', {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) throw new Error('Failed to create exercise');

      // Reset form and close dialog
      setFormData({
        name: '',
        description: '',
        primaryMuscles: [],
        secondaryMuscles: [],
        level: '',
        category: '',
        equipment: '',
        instructions: '',
        images: [],
      });
      setHighlightedMuscle(null);
      onClose();
      onSuccess();
    } catch (error) {
      console.error('Error creating exercise:', error);
      alert('Failed to create exercise');
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      primaryMuscles: [],
      secondaryMuscles: [],
      level: '',
      category: '',
      equipment: '',
      instructions: '',
      images: [],
    });
    setHighlightedMuscle(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create Custom Exercise</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Exercise name"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Exercise description"
              className="mt-1"
              rows={3}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Muscles</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={muscleSelectorMode === 'dropdown' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMuscleSelectorMode('dropdown')}
                >
                  Dropdown
                </Button>
                <Button
                  type="button"
                  variant={muscleSelectorMode === 'body' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMuscleSelectorMode('body')}
                >
                  Body Selector
                </Button>
              </div>
            </div>

            {muscleSelectorMode === 'dropdown' ? (
              <div className="space-y-4">
                <div>
                  <Label>Primary Muscles</Label>
                  <Select
                    value=""
                    onValueChange={(value) => {
                      if (value && !formData.primaryMuscles.includes(value)) {
                        setFormData({
                          ...formData,
                          primaryMuscles: [...formData.primaryMuscles, value],
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Add primary muscle" />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_MUSCLE_OPTIONS.map(muscle => (
                        <SelectItem key={muscle} value={muscle}>{muscle}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.primaryMuscles.map(muscle => (
                      <Badge key={muscle} className="bg-primary">
                        {muscle}
                        <button
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            primaryMuscles: formData.primaryMuscles.filter(m => m !== muscle),
                          })}
                          className="ml-2"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Secondary Muscles</Label>
                  <Select
                    value=""
                    onValueChange={(value) => {
                      if (value && !formData.secondaryMuscles.includes(value)) {
                        setFormData({
                          ...formData,
                          secondaryMuscles: [...formData.secondaryMuscles, value],
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Add secondary muscle" />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_MUSCLE_OPTIONS.map(muscle => (
                        <SelectItem key={muscle} value={muscle}>{muscle}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.secondaryMuscles.map(muscle => (
                      <Badge key={muscle} variant="secondary">
                        {muscle}
                        <button
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            secondaryMuscles: formData.secondaryMuscles.filter(m => m !== muscle),
                          })}
                          className="ml-2"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 flex gap-3">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1 text-center">Front</div>
                      <Model
                        data={exerciseData}
                        highlightedColors={themeColors}
                        style={{ width: '150px', height: '210px' }}
                        bodyColor="#e5e7eb"
                        type="anterior"
                        onClick={(muscleStats: any) => {
                          const muscleName = ALL_MUSCLE_OPTIONS.find(m => mapMuscleName(m) === muscleStats.name);
                          if (muscleName) {
                            setHighlightedMuscle(muscleName);
                            if (!formData.primaryMuscles.includes(muscleName) && 
                                !formData.secondaryMuscles.includes(muscleName)) {
                              setFormData({
                                ...formData,
                                primaryMuscles: [...formData.primaryMuscles, muscleName],
                              });
                            }
                          }
                        }}
                      />
                    </div>
                    {needsBackView && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1 text-center">Back</div>
                        <Model
                          data={exerciseData}
                          highlightedColors={themeColors}
                          style={{ width: '150px', height: '210px' }}
                          bodyColor="#e5e7eb"
                          type="posterior"
                          onClick={(muscleStats: any) => {
                            const muscleName = ALL_MUSCLE_OPTIONS.find(m => mapMuscleName(m) === muscleStats.name);
                            if (muscleName) {
                              setHighlightedMuscle(muscleName);
                              if (!formData.primaryMuscles.includes(muscleName) && 
                                  !formData.secondaryMuscles.includes(muscleName)) {
                                setFormData({
                                  ...formData,
                                  primaryMuscles: [...formData.primaryMuscles, muscleName],
                                });
                              }
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-3 h-3 rounded bg-primary"></div>
                        <span className="text-xs font-medium">Primary</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {formData.primaryMuscles.map(muscle => (
                          <Badge
                            key={muscle}
                            className="bg-primary cursor-pointer"
                            onClick={() => {
                              setHighlightedMuscle(muscle);
                              setFormData({
                                ...formData,
                                primaryMuscles: formData.primaryMuscles.filter(m => m !== muscle),
                                secondaryMuscles: [...formData.secondaryMuscles, muscle],
                              });
                            }}
                          >
                            {muscle}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-3 h-3 rounded bg-secondary"></div>
                        <span className="text-xs font-medium">Secondary</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {formData.secondaryMuscles.map(muscle => (
                          <Badge
                            key={muscle}
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() => {
                              setHighlightedMuscle(muscle);
                              setFormData({
                                ...formData,
                                secondaryMuscles: formData.secondaryMuscles.filter(m => m !== muscle),
                                primaryMuscles: [...formData.primaryMuscles, muscle],
                              });
                            }}
                          >
                            {muscle}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="level">Difficulty Level</Label>
              <Select
                value={formData.level}
                onValueChange={(value) => setFormData({ ...formData, level: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strength">Strength</SelectItem>
                  <SelectItem value="stretching">Stretching</SelectItem>
                  <SelectItem value="plyometrics">Plyometrics</SelectItem>
                  <SelectItem value="cardio">Cardio</SelectItem>
                  <SelectItem value="strongman">Strongman</SelectItem>
                  <SelectItem value="powerlifting">Powerlifting</SelectItem>
                  <SelectItem value="olympic weightlifting">Olympic Weightlifting</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="equipment">Equipment</Label>
            <Input
              id="equipment"
              value={formData.equipment}
              onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
              placeholder="e.g., dumbbell, barbell, body only"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              placeholder="Enter instructions, one per line"
              className="mt-1"
              rows={5}
            />
          </div>

          <div>
            <Label>Images (up to 2)</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              {[0, 1].map(idx => (
                <div key={idx}>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, idx)}
                    className="mt-1"
                  />
                  {formData.images[idx] && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      {formData.images[idx].name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Create Exercise
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

