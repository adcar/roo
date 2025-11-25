'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { storage } from '@/lib/storage';
import { Program } from '@/types/exercise';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Eye, Edit, Trash2 } from 'lucide-react';

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);

  useEffect(() => {
    const storedPrograms = storage.getPrograms();
    // Ensure programs is always an array
    setPrograms(Array.isArray(storedPrograms) ? storedPrograms : []);
  }, []);

  const handleDelete = (programId: string) => {
    if (confirm('Are you sure you want to delete this program?')) {
      storage.deleteProgram(programId);
      setPrograms(storage.getPrograms());
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-4xl font-bold mb-2">My Programs</h1>
          <p className="text-muted-foreground">{programs.length} program(s) created</p>
        </div>

        <Link href="/programs/new">
          <Button className="mb-8">
            <Plus className="mr-2 h-4 w-4" />
            Create New Program
          </Button>
        </Link>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map(program => (
            <Card key={program.id}>
              <CardHeader>
                <CardTitle>{program.name}</CardTitle>
                <CardDescription>{program.days.length} day(s)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  {program.days.map(day => (
                    <div key={day.id} className="text-sm">
                      <span className="font-semibold">{day.name}</span>
                      <div className="text-muted-foreground text-xs mt-1">
                        {program.isSplit !== false
                          ? `Week A: ${day.weekA.length} exercises • Week B: ${day.weekB.length} exercises`
                          : `${day.weekA.length} exercise${day.weekA.length !== 1 ? 's' : ''}`}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Link href={`/programs/${program.id}`} className="flex-1">
                    <Button variant="outline" className="w-full" size="sm">
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Button>
                  </Link>
                  <Link href={`/programs/${program.id}/edit`} className="flex-1">
                    <Button variant="outline" className="w-full" size="sm">
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  </Link>
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

        {programs.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-xl mb-4">No programs created yet</p>
            <Link href="/programs/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Program
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
