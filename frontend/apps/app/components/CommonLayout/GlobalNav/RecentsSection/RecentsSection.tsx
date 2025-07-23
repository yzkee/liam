import { fetchRecentSessions } from './fetchRecentSessions'
import { RecentsSectionClient } from './RecentsSectionClient'

export const RecentsSection = async () => {
  const sessions = await fetchRecentSessions(5)

  return <RecentsSectionClient sessions={sessions} />
}
