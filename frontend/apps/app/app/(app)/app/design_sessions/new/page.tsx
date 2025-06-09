import { getProjects } from '@/components/CommonLayout/AppBar/ProjectsDropdownMenu/services/getProjects'
import { SessionsNewPage } from '@/components/SessionsNewPage'
import { getOrganizationId } from '@/features/organizations/services/getOrganizationId'

export default async function Page() {
  const organizationId = await getOrganizationId()
  const { data: projects } = await getProjects(organizationId)

  return <SessionsNewPage projects={projects} />
}
