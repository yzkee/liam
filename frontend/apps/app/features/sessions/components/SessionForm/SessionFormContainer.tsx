import { getProjects } from '@/components/CommonLayout/AppBar/ProjectsDropdownMenu/services/getProjects'
import { getOrganizationId } from '@/features/organizations/services/getOrganizationId'
import type { FC } from 'react'
import { SessionForm } from './SessionForm'

export const SessionFormContainer: FC = async () => {
  const organizationId = await getOrganizationId()
  const { data: projects } = await getProjects(organizationId)

  return <SessionForm projects={projects} />
}
