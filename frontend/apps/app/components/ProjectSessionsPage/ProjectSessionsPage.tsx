import { MessagesSquare } from '@liam-hq/ui'
import type { FC } from 'react'
import { getProjects } from '@/components/CommonLayout/AppBar/ProjectsDropdownMenu/services/getProjects'
import { getOrganizationId } from '@/features/organizations/services/getOrganizationId'
import { SessionFormContainer } from '@/features/sessions/components/SessionFormContainer'
import styles from './ProjectSessionsPage.module.css'
import { SessionItem } from './SessionItem'
import { fetchProjectSessions } from './services/fetchProjectSessions'

type Props = {
  projectId: string
}

export const ProjectSessionsPage: FC<Props> = async ({ projectId }) => {
  const sessions = await fetchProjectSessions(projectId)
  const organizationId = await getOrganizationId()
  const projectsResponse = await getProjects(organizationId)
  const projects = projectsResponse.data || []

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2 className={styles.title}>Sessions</h2>
          <p className={styles.description}>Design sessions for this project</p>
        </div>
      </div>

      <div className={styles.formSection}>
        <h3 className={styles.formTitle}>Create New Session</h3>
        <SessionFormContainer
          projects={projects}
          defaultProjectId={projectId}
        />
      </div>

      {sessions.length > 0 ? (
        <div className={styles.sessionsList}>
          {sessions.map((session) => (
            <SessionItem key={session.id} session={session} />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <MessagesSquare size={48} />
          </div>
          <h3 className={styles.emptyTitle}>No sessions yet</h3>
          <p className={styles.emptyDescription}>
            Start a new design session to explore ideas and generate artifacts
            for this project.
          </p>
        </div>
      )}
    </div>
  )
}
