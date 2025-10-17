import { getInstallations } from '@liam-hq/github'
import { redirect } from 'next/navigation'
import { ProjectNewPage } from '../../../components/ProjectNewPage'
import { getOrganizationId } from '../../../features/organizations/services/getOrganizationId'
import { createClient } from '../../../libs/db/server'
import { getUserAccessToken } from '../../../libs/github/token'
import { urlgen } from '../../../libs/routes'

export default async function NewProjectPage() {
  const organizationIdResult = await getOrganizationId()

  if (organizationIdResult.isErr()) {
    console.error('Failed to get organization ID:', organizationIdResult.error)
    redirect(urlgen('login'))
  }

  const organizationId = organizationIdResult.value

  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    console.error('Error fetching user:', error)
    redirect(urlgen('login'))
  }

  const tokenResult = await getUserAccessToken()
  if (tokenResult.isErr()) {
    console.error('Failed to get user access token:', tokenResult.error)
    redirect(urlgen('login'))
  }
  const token = tokenResult.value
  if (!token) {
    redirect(urlgen('login'))
  }

  const installationsResult = await getInstallations(token)
  const { installations } = await installationsResult.match(
    (v) => v,
    (e) => {
      console.error('Failed to fetch installations:', e)
      return { installations: [] }
    },
  )
  const needsRefresh = !token || installations.length === 0

  return (
    <ProjectNewPage
      installations={installations}
      organizationId={organizationId}
      needsRefresh={needsRefresh}
    />
  )
}
