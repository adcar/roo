'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/toast';
import { Sparkles, Loader2, ArrowLeft } from 'lucide-react';
import { Program } from '@/types/exercise';
import { useLoading } from '@/components/LoadingProvider';
import { useExercises } from '@/hooks/useExercises';
import Link from 'next/link';

export default function AIGenerateProgramPage() {
  const router = useRouter();
  const { startLoading, stopLoading } = useLoading();
  const { exercises } = useExercises();
  const [step, setStep] = useState<'questions' | 'generating' | 'review'>('questions');
  const [fitnessGoals, setFitnessGoals] = useState('');
  const [workoutFrequency, setWorkoutFrequency] = useState<number>(3);
  const [preferIsolation, setPreferIsolation] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [generatedProgram, setGeneratedProgram] = useState<Omit<Program, 'id' | 'createdAt' | 'updatedAt'> | null>(null);
  const [generating, setGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('Initializing...');

  async function handleGenerate() {
    if (!fitnessGoals.trim()) {
      toast('Please enter your fitness goals', {
        variant: 'destructive',
      });
      return;
    }

    setGenerating(true);
    setStep('generating');
    setStatusMessage('Initializing...');

    try {
      const response = await fetch('/api/ai/generate-program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fitnessGoals,
          workoutFrequency,
          preferIsolation,
          additionalNotes: additionalNotes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate program');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'status') {
                setStatusMessage(data.content);
              } else if (data.type === 'complete') {
                setGeneratedProgram(data.content);
                setStep('review');
                setGenerating(false);
                return;
              } else if (data.type === 'error') {
                throw new Error(data.content);
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error('Error generating program:', error);
      toast('Failed to generate program', {
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
      setStep('questions');
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!generatedProgram) return;

    try {
      startLoading();
      const program: Program = {
        id: Date.now().toString(),
        ...generatedProgram,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const response = await fetch('/api/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(program),
      });

      if (!response.ok) {
        throw new Error('Failed to save program');
      }

      toast('Program created successfully!', {
        description: 'Your AI-generated program has been saved.',
      });

      router.push(`/programs/${program.id}`);
    } catch (error) {
      console.error('Error saving program:', error);
      toast('Failed to save program', {
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      stopLoading();
    }
  }

  if (step === 'generating') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center w-full">
                <h3 className="text-lg font-semibold mb-2">Generating Your Program</h3>
                <p className="text-muted-foreground min-h-[3rem] flex items-center justify-center">
                  {statusMessage}
                </p>
                <div className="mt-4 w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'review' && generatedProgram) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-6">
            <Link href="/programs" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Programs
            </Link>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Sparkles className="h-8 w-8" />
              Review Generated Program
            </h1>
            <p className="text-muted-foreground">
              Review your AI-generated program and save it to your programs list
            </p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{generatedProgram.name}</CardTitle>
              <CardDescription>
                {generatedProgram.days.length} workout days
                {generatedProgram.isSplit && ' • Week A/B Split'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {generatedProgram.days.map((day, dayIndex) => (
                  <div key={day.id} className="border rounded-lg p-4">
                    <h3 className="font-semibold text-lg mb-3">{day.name}</h3>
                    <div className="space-y-2">
                      {day.weekA.map((exercise, exIndex) => {
                        const exerciseData = exercises.find(e => e.id === exercise.exerciseId);
                        return (
                          <div key={exIndex} className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">Exercise {exIndex + 1}:</span>{' '}
                            {exerciseData?.name || exercise.exerciseId} • {exercise.sets} sets × {exercise.reps} reps
                            {exercise.weight && ` @ ${exercise.weight}`}
                            {exercise.notes && (
                              <span className="block mt-1 text-xs italic">{exercise.notes}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4 justify-end">
            <Button variant="outline" onClick={() => setStep('questions')}>
              Regenerate
            </Button>
            <Button onClick={handleSave}>
              Save Program
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <Link href="/programs" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Programs
          </Link>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Sparkles className="h-8 w-8" />
            AI Program Generator
          </h1>
          <p className="text-muted-foreground">
            Answer a few questions and our AI will create a personalized workout program for you
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tell Us About Your Goals</CardTitle>
            <CardDescription>
              The more details you provide, the better we can tailor your program
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fitnessGoals">What are your fitness goals? *</Label>
              <Textarea
                id="fitnessGoals"
                placeholder="e.g., Build muscle, lose weight, improve strength, general fitness, prepare for a competition..."
                value={fitnessGoals}
                onChange={(e) => setFitnessGoals(e.target.value)}
                rows={4}
                required
              />
              <p className="text-xs text-muted-foreground">
                Be specific! Examples: "Build muscle mass in my upper body", "Lose 20 pounds and improve cardiovascular health", "Increase strength for powerlifting"
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="workoutFrequency">How many days per week do you want to work out? *</Label>
              <Select value={workoutFrequency.toString()} onValueChange={(val) => setWorkoutFrequency(parseInt(val))}>
                <SelectTrigger id="workoutFrequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 days per week</SelectItem>
                  <SelectItem value="3">3 days per week</SelectItem>
                  <SelectItem value="4">4 days per week</SelectItem>
                  <SelectItem value="5">5 days per week</SelectItem>
                  <SelectItem value="6">6 days per week</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {workoutFrequency <= 2 
                  ? 'With 2 days per week, we\'ll create full-body workouts to maximize efficiency.'
                  : workoutFrequency === 3
                  ? 'With 3 days per week, we can do full-body or a 3-day split depending on your preferences.'
                  : 'With more frequent workouts, we can create specialized split routines targeting different muscle groups.'}
              </p>
            </div>

            {workoutFrequency >= 3 && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="preferIsolation"
                  checked={preferIsolation}
                  onCheckedChange={(checked) => setPreferIsolation(checked === true)}
                />
                <label
                  htmlFor="preferIsolation"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Prefer isolation exercises and body part splits (e.g., Push/Pull/Legs)
                </label>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="additionalNotes">Additional notes or preferences (optional)</Label>
              <Textarea
                id="additionalNotes"
                placeholder="e.g., I have knee issues, I prefer compound movements, I want to focus on core strength..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="pt-4 flex gap-4 justify-end">
              <Button variant="outline" asChild>
                <Link href="/programs">Cancel</Link>
              </Button>
              <Button onClick={handleGenerate} disabled={!fitnessGoals.trim() || generating}>
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Program
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> This feature uses AI to generate programs. Make sure you have set up your{' '}
              <Link href="/settings" className="text-primary underline">
                user settings
              </Link>
              {' '}including your available equipment and physical stats (weight, height) for best results.
              You'll need to configure an OpenAI API key in your environment variables.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

