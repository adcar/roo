import { Suspense } from 'react';
import { getProgramsPageData } from '@/lib/server-data';
import { ProgramsList } from '@/components/programs-list';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Programs' };

export default async function ProgramsPage() {
  const data = getProgramsPageData();

  return (
    <div className="px-4 pt-6">
      <Suspense fallback={<ProgramsSkeleton />}>
        <ProgramsListWrapper dataPromise={data} />
      </Suspense>
    </div>
  );
}

async function ProgramsListWrapper({ dataPromise }: { dataPromise: ReturnType<typeof getProgramsPageData> }) {
  const { programs, weekMapping, inProgress } = await dataPromise;
  return (
    <ProgramsList
      initialPrograms={programs}
      initialWeekMapping={weekMapping}
      initialInProgress={inProgress}
    />
  );
}

function ProgramsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 rounded-lg bg-[var(--muted)] animate-pulse" />
        <div className="h-12 w-12 rounded-xl bg-[var(--muted)] animate-pulse" />
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="h-32 rounded-xl bg-[var(--muted)] animate-pulse" />
      ))}
    </div>
  );
}
