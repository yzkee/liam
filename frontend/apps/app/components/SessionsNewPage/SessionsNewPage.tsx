import type { FC } from 'react'
import { getProjects } from '@/components/CommonLayout/AppBar/ProjectsDropdownMenu/services/getProjects'
import { getOrganizationId } from '@/features/organizations/services/getOrganizationId'
import { SessionFormContainer } from '@/features/sessions/components/SessionFormContainer'
import styles from './SessionsNewPage.module.css'

export const SessionsNewPage: FC = async () => {
  const organizationId = await getOrganizationId()
  const projectsResponse = await getProjects(organizationId)
  const projects = projectsResponse.data || []

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <h1 className={styles.title}>
          What can I help you <br />
          Database Design?
        </h1>
        <SessionFormContainer projects={projects} />
      </div>
    </div>
  )
}
