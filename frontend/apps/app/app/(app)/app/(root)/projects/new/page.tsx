import { getInstallations } from '@liam-hq/github'
import { redirect } from 'next/navigation'
import { ProjectNewPage } from '@/components/ProjectNewPage'
import { getOrganizationId } from '@/features/organizations/services/getOrganizationId'
import { createClient } from '@/libs/db/server'

export default async function NewProjectPage() {
  const organizationIdResult = await getOrganizationId()

  if (organizationIdResult.isErr()) {
    console.error('Failed to get organization ID:', organizationIdResult.error)
    redirect('/login')
  }

  const organizationId = organizationIdResult.value

  // TODO: Reconsider what screen should be displayed to the user when organizationId is not available
  if (organizationId == null) {
    return null
  }

  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    console.error('Error fetching user:', error)
    redirect('/login')
  }

  const { data } = await supabase.auth.getSession()

  if (data.session === null) {
    redirect('/login')
  }

  const { installations } = await getInstallations(data.session)

  return (
    <ProjectNewPage
      installations={installations}
      organizationId={organizationId}
    />
  )
}
