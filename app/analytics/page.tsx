import { AnalyticsContent } from '@/components/AnalyticsContent';
import { getWorkoutLogs, getPrograms } from '@/lib/server-data';

export default async function AnalyticsPage() {
  const [workoutLogs, programs] = await Promise.all([
    getWorkoutLogs(),
    getPrograms(),
  ]);

  return <AnalyticsContent initialWorkoutLogs={workoutLogs} initialPrograms={programs} />;
}
