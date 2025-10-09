import { getOrganizationId } from '../../../../features/organizations/services/getOrganizationId'
import { fetchRecentSessions } from './fetchRecentSessions'
import { RecentsSectionClient } from './RecentsSectionClient'

export const RecentsSection = async () => {
  const organizationIdResult = await getOrganizationId()
  if (organizationIdResult.isErr()) {
    return null
  }

  const organizationId = organizationIdResult.value
  const sessions = await fetchRecentSessions(organizationId, 5)

  return <RecentsSectionClient sessions={sessions} />
}
