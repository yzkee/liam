import { fetchRecentSessions } from './fetchRecentSessions'
import { RecentsSectionClient } from './RecentsSectionClient'

export const RecentsSection = async ({
  organizationId,
}: {
  organizationId: string
}) => {
  const sessions = await fetchRecentSessions(organizationId, 5)

  return <RecentsSectionClient sessions={sessions} />
}
