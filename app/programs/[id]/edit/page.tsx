'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Program } from '@/types/exercise';
import ProgramForm from '@/components/ProgramForm';
import { useLoading } from '@/components/LoadingProvider';

export default function EditProgramPage() {
  const params = useParams();
  const router = useRouter();
  const { startLoading, stopLoading } = useLoading();
  const [program, setProgram] = useState<Program | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (params.id) {
      startLoading();
      fetch(`/api/programs/${params.id}`)
        .then(res => {
          if (!res.ok) {
            if (res.status === 404) {
              setNotFound(true);
            }
            stopLoading();
            return;
          }
          return res.json();
        })
        .then(data => {
          if (data) {
            setProgram(data);
          }
          stopLoading();
        })
        .catch(error => {
          console.error('Error loading program:', error);
          stopLoading();
        });
    }
  }, [params.id, startLoading, stopLoading]);

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

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-2xl">Program not found</div>
      </div>
    );
  }

  if (!program) {
    return null;
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
