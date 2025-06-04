import { createOrganizationAuto } from '@/components/OrganizationNewPage/actions/createOrganizations'
import { setOrganizationIdCookie } from '@/features/organizations/services/setOrganizationIdCookie'
import { createClient } from '@/libs/db/server'
import { urlgen } from '@/libs/routes'
import { captureException } from '@sentry/nextjs'
import { redirect } from 'next/navigation'

async function handleUserWithoutOrganization() {
  const result = await createOrganizationAuto()

  if (result.success) {
    const organizationId = result.organizationId
    await setOrganizationIdCookie(organizationId)
    redirect(urlgen('projects/new'))
  } else {
    captureException(
      new Error(`Auto organization creation failed: ${result.error}`),
    )
    redirect(urlgen('organizations/new'))
  }
}

async function handleUserWithOrganization(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
) {
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id')
    .eq('organization_id', organizationId)
    .limit(1)

  if (projectsError) {
    captureException(
      new Error(`Error fetching projects: ${projectsError.message}`),
    )
  }

  if (projects && projects.length > 0) {
    redirect(urlgen('projects'))
  }

  redirect(urlgen('projects/new'))
}

export default async function Page() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect(urlgen('login'))
  }

  const { data: organizationMembers, error: orgError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', data.user.id)
    .limit(1)

  if (orgError) {
    captureException(
      new Error(`Error fetching organization members: ${orgError}`),
    )
  }

  if (!organizationMembers || organizationMembers.length === 0) {
    await handleUserWithoutOrganization()
  } else {
    const organizationId = organizationMembers[0].organization_id
    await handleUserWithOrganization(supabase, organizationId)
  }
}
