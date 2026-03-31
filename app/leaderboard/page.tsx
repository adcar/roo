import { Suspense } from 'react';
import { getLeaderboard } from '@/lib/server-data';
import { LeaderboardContent } from '@/components/leaderboard-content';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Leaderboard' };

export default async function LeaderboardPage() {
  const dataPromise = getLeaderboard();

  return (
    <div className="px-4 pt-6 pb-8">
      <h1 className="text-2xl font-bold mb-4">Leaderboard</h1>
      <Suspense fallback={<LeaderboardSkeleton />}>
        <LeaderboardWrapper dataPromise={dataPromise} />
      </Suspense>
    </div>
  );
}

async function LeaderboardWrapper({ dataPromise }: { dataPromise: ReturnType<typeof getLeaderboard> }) {
  const entries = await dataPromise;
  return <LeaderboardContent entries={entries} />;
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 rounded-xl bg-[var(--muted)] animate-pulse" />)}
    </div>
  );
}
