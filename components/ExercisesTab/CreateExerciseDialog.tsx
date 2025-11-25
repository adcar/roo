'use client';

import { useState, FormEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ALL_MUSCLE_OPTIONS } from './utils';
import { toast } from '@/components/ui/toast';
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react';

interface CreateExerciseDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateExerciseDialog({ open, onClose, onSuccess }: CreateExerciseDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [primaryMuscles, setPrimaryMuscles] = useState<string[]>([]);
  const [secondaryMuscles, setSecondaryMuscles] = useState<string[]>([]);
  const [level, setLevel] = useState('beginner');
  const [category, setCategory] = useState('strength');
  const [equipment, setEquipment] = useState('');
  const [instructions, setInstructions] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPrimaryMuscle, setSelectedPrimaryMuscle] = useState('');
  const [selectedSecondaryMuscle, setSelectedSecondaryMuscle] = useState('');
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);

  const handleAddPrimaryMuscle = () => {
    if (selectedPrimaryMuscle && !primaryMuscles.includes(selectedPrimaryMuscle)) {
      setPrimaryMuscles([...primaryMuscles, selectedPrimaryMuscle]);
      setSelectedPrimaryMuscle('');
    }
  };

  const handleRemovePrimaryMuscle = (muscle: string) => {
    setPrimaryMuscles(primaryMuscles.filter(m => m !== muscle));
  };

  const handleAddSecondaryMuscle = () => {
    if (selectedSecondaryMuscle && !secondaryMuscles.includes(selectedSecondaryMuscle) && !primaryMuscles.includes(selectedSecondaryMuscle)) {
      setSecondaryMuscles([...secondaryMuscles, selectedSecondaryMuscle]);
      setSelectedSecondaryMuscle('');
    }
  };

  const handleRemoveSecondaryMuscle = (muscle: string) => {
    setSecondaryMuscles(secondaryMuscles.filter(m => m !== muscle));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const newImages = [...images];
      newImages[index] = file;
      setImages(newImages);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast('Name is required', { variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('primaryMuscles', JSON.stringify(primaryMuscles));
      formData.append('secondaryMuscles', JSON.stringify(secondaryMuscles));
      formData.append('level', level);
      formData.append('category', category);
      formData.append('equipment', equipment);
      formData.append('instructions', instructions);
      
      images.forEach((image, index) => {
        if (image) {
          formData.append(`image${index}`, image);
        }
      });

      const response = await fetch('/api/custom-exercises', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create exercise');
      }

      toast('Custom exercise created successfully!', { variant: 'success' });
      
      // Reset form
      setName('');
      setDescription('');
      setPrimaryMuscles([]);
      setSecondaryMuscles([]);
      setLevel('beginner');
      setCategory('strength');
      setEquipment('');
      setInstructions('');
      setImages([]);
      setShowAdvancedFields(false);
      
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating exercise:', error);
      toast(error instanceof Error ? error.message : 'Failed to create exercise', { variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Custom Exercise</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Exercise Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Leg Curl"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of the exercise"
              rows={3}
            />
          </div>

          <div>
            <Label>Primary Muscles</Label>
            <div className="flex gap-2 mb-2">
              <Select value={selectedPrimaryMuscle} onValueChange={setSelectedPrimaryMuscle}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select muscle" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_MUSCLE_OPTIONS.map(muscle => (
                    <SelectItem key={muscle} value={muscle}>{muscle}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" onClick={handleAddPrimaryMuscle} variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {primaryMuscles.map(muscle => (
                <div key={muscle} className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-md">
                  <span className="text-sm">{muscle}</span>
                  <button
                    type="button"
                    onClick={() => handleRemovePrimaryMuscle(muscle)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="md:hidden">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowAdvancedFields(!showAdvancedFields)}
              className="w-full justify-between text-muted-foreground"
            >
              <span>Additional Details</span>
              {showAdvancedFields ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>

          <div className={`${showAdvancedFields ? 'block' : 'hidden'} md:block space-y-4`}>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="level">Level</Label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger>
                    <SelectValue />
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
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
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
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                placeholder="e.g., Dumbbell, Barbell, Bodyweight"
              />
            </div>
          </div>

          <div className={`${showAdvancedFields ? 'block' : 'hidden'} md:block`}>
            <Label>Secondary Muscles</Label>
            <div className="flex gap-2 mb-2">
              <Select value={selectedSecondaryMuscle} onValueChange={setSelectedSecondaryMuscle}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select muscle" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_MUSCLE_OPTIONS.map(muscle => (
                    <SelectItem key={muscle} value={muscle}>{muscle}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" onClick={handleAddSecondaryMuscle} variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {secondaryMuscles.map(muscle => (
                <div key={muscle} className="flex items-center gap-1 px-2 py-1 bg-secondary/10 rounded-md">
                  <span className="text-sm">{muscle}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSecondaryMuscle(muscle)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className={`${showAdvancedFields ? 'block' : 'hidden'} md:block`}>
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Step-by-step instructions (one per line)"
              rows={4}
            />
          </div>

          <div className={`${showAdvancedFields ? 'block' : 'hidden'} md:block`}>
            <Label>Images (optional, max 2)</Label>
            <div className="grid grid-cols-2 gap-4">
              {[0, 1].map(index => (
                <div key={index}>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, index)}
                    className="cursor-pointer"
                  />
                  {images[index] && (
                    <p className="text-xs text-muted-foreground mt-1">{images[index].name}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Exercise'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

