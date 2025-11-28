import { LeaderboardContent } from '@/components/LeaderboardContent';
import { getLeaderboard } from '@/lib/server-data';

// Revalidate every 60 seconds to keep leaderboard data fresh
export const revalidate = 60;

export default async function LeaderboardPage() {
  const leaderboard = await getLeaderboard();

  return <LeaderboardContent initialLeaderboard={leaderboard} />;
}

