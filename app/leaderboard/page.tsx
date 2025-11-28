import { LeaderboardContent } from '@/components/LeaderboardContent';
import { getLeaderboard } from '@/lib/server-data';

export default async function LeaderboardPage() {
  const leaderboard = await getLeaderboard();

  return <LeaderboardContent initialLeaderboard={leaderboard} />;
}

