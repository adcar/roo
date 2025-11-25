'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Program } from '@/types/exercise';
import ProgramForm from '@/components/ProgramForm';

export default function EditProgramPage() {
  const params = useParams();
  const router = useRouter();
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetch(`/api/programs/${params.id}`)
        .then(res => res.json())
        .then(data => {
          setProgram(data);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error loading program:', error);
          setLoading(false);
        });
    }
  }, [params.id]);

  const handleSave = async (programData: Omit<Program, 'id' | 'createdAt' | 'updatedAt'>) => {
    const updatedProgram: Program = {
      id: params.id as string,
      ...programData,
      createdAt: program?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await fetch(`/api/programs/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedProgram),
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-2xl">Loading...</div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-2xl">Program not found</div>
      </div>
    );
  }

  return (
    <ProgramForm
      initialProgram={program}
      onSave={handleSave}
      cancelUrl="/"
      title="Edit Program"
      saveButtonText="Save Changes"
    />
  );
}
