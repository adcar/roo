'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Program } from '@/types/exercise';
import ProgramForm from '@/components/program-form';

export default function EditProgramPage() {
  const params = useParams();
  const router = useRouter();
  const [program, setProgram] = useState<Program | null>(null);

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/programs/${params.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setProgram(d); else router.replace('/programs'); });
  }, [params.id, router]);

  if (!program) {
    return (
      <div className="flex h-[60dvh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  const handleSave = async (data: Omit<Program, 'id' | 'createdAt' | 'updatedAt'>) => {
    await fetch(`/api/programs/${program.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, updatedAt: new Date().toISOString() }),
    });
  };

  return <ProgramForm initialProgram={program} onSave={handleSave} cancelUrl={`/programs/${program.id}`} title="Edit Program" />;
}
