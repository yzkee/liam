import { redirect } from 'next/navigation'
import { ProjectsPage } from '@/components/ProjectsPage'
import { getOrganizationId } from '@/features/organizations/services/getOrganizationId'
import { createClient } from '@/libs/db/server'

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

  const supabase = await createClient()
  const { data } = await supabase.auth.getSession()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    console.error('Error fetching user:', error)
    redirect('/login')
  }
  if (data.session === null) {
    redirect('/login')
  }

  return <ProjectsPage organizationId={organizationId} />
}
