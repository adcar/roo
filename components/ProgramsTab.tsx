'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Program } from '@/types/exercise';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Play } from 'lucide-react';

export default function ProgramsTab() {
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      const res = await fetch('/api/programs');
      const data = await res.json();
      setPrograms(data);
    } catch (error) {
      console.error('Error fetching programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (programId: string) => {
    if (confirm('Are you sure you want to delete this program?')) {
      try {
        await fetch(`/api/programs/${programId}`, { method: 'DELETE' });
        setPrograms(programs.filter(p => p.id !== programId));
      } catch (error) {
        console.error('Error deleting program:', error);
      }
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading programs...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">My Programs</h2>
          <p className="text-muted-foreground">{programs.length} program(s) created</p>
        </div>
        <Link href="/programs/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Program
          </Button>
        </Link>
      </div>

      {programs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground text-lg mb-4">No programs created yet</p>
            <Link href="/programs/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Program
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map(program => (
            <Card 
              key={program.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push(`/programs/${program.id}`)}
            >
              <CardHeader className="relative">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle>{program.name}</CardTitle>
                    <CardDescription>{program.days.length} day(s)</CardDescription>
                  </div>
                  <Link 
                    href={`/programs/${program.id}/edit`} 
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-4">
                  {program.days.map(day => (
                    <div 
                      key={day.id} 
                      className="flex items-center justify-between p-2 rounded bg-muted"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex-1">
                        <div className="font-semibold text-sm">{day.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Week A: {day.weekA.length} • Week B: {day.weekB.length}
                        </div>
                      </div>
                      <Link href={`/workout?programId=${program.id}&dayId=${day.id}`} onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="ghost">
                          <Play className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(program.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
