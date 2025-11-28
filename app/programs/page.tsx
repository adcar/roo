import { ProgramsContent } from '@/components/ProgramsContent';
import { getPrograms, getWeekMapping, getInProgressWorkouts } from '@/lib/server-data';

export const dynamic = 'force-dynamic';

export default async function ProgramsPage() {
  const [programs, weekMapping, inProgressWorkouts] = await Promise.all([
    getPrograms(),
    getWeekMapping(),
    getInProgressWorkouts(),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <ProgramsContent 
          initialPrograms={programs}
          initialWeekMapping={weekMapping}
          initialInProgressWorkouts={inProgressWorkouts}
        />
      </div>
    </div>
  );
}
