import { redirect } from 'next/navigation'
import { GeneralPage } from '@/components/GeneralPage'
import { getOrganizationId } from '@/features/organizations/services/getOrganizationId'

export default async function Page() {
  const organizationIdResult = await getOrganizationId()
  if (organizationIdResult.isErr()) {
    redirect('/login')
  }

  const organizationId = organizationIdResult.value
  // TODO: Reconsider what screen should be displayed to the user when organizationId is not available
  if (organizationId == null) {
    return null
  }

  return <GeneralPage organizationId={organizationId} />
}
