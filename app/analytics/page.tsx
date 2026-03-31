import { Suspense } from 'react';
import { getWorkoutLogs, getPrograms } from '@/lib/server-data';
import { AnalyticsContent } from '@/components/analytics-content';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Analytics' };

export default async function AnalyticsPage() {
  const dataPromise = Promise.all([getWorkoutLogs(), getPrograms()]);

  return (
    <div className="px-4 pt-6 pb-8">
      <h1 className="text-2xl font-bold mb-4">Analytics</h1>
      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsWrapper dataPromise={dataPromise} />
      </Suspense>
    </div>
  );
}

async function AnalyticsWrapper({ dataPromise }: { dataPromise: Promise<any[]> }) {
  const [logs, programs] = await dataPromise;
  return <AnalyticsContent logs={logs} programs={programs} />;
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => <div key={i} className="h-48 rounded-xl bg-[var(--muted)] animate-pulse" />)}
    </div>
  );
}
