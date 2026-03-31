'use client';

import { useRouter } from 'next/navigation';
import type { Program } from '@/types/exercise';
import ProgramForm from '@/components/program-form';

export default function NewProgramPage() {
  const router = useRouter();

  const handleSave = async (data: Omit<Program, 'id' | 'createdAt' | 'updatedAt'>) => {
    const program = {
      id: Date.now().toString(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const res = await fetch('/api/programs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(program),
    });
    if (res.ok) router.push('/programs');
  };

  return <ProgramForm onSave={handleSave} cancelUrl="/programs" title="New Program" />;
}
