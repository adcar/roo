'use client';

import { useRouter } from 'next/navigation';
import { Program } from '@/types/exercise';
import ProgramForm from '@/components/ProgramForm';

export default function NewProgramPage() {
  const router = useRouter();

  const handleSave = async (programData: Omit<Program, 'id' | 'createdAt' | 'updatedAt'>) => {
    const program: Program = {
      id: Date.now().toString(),
      ...programData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await fetch('/api/programs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(program),
    });
  };

  return (
    <ProgramForm
      onSave={handleSave}
      cancelUrl="/"
      title="Create New Program"
    />
  );
}
