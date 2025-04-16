'use client'

import { FC } from 'react'
import { EmptyProjectsState, ProjectItem, SearchInput } from '../../components'
import { useProjectSearch } from '../../hooks/useProjectSearch'
import styles from './ProjectsPage.module.css'
import { ChevronDown } from '@liam-hq/ui'
import Link from 'next/link'
import { urlgen } from '@/utils/routes'

interface Project {
  id: number
  name: string
  createdAt: string
  organizationId: number | null
}

interface ClientSearchWrapperProps {
  initialProjects: Project[] | null
  organizationId?: number
}

export const ClientSearchWrapper: FC<ClientSearchWrapperProps> = ({
  initialProjects,
  organizationId,
}) => {
  const { searchResult, searchProjects } = useProjectSearch(
    organizationId,
    initialProjects,
  )

  const { projects, loading } = searchResult

  return (
    <div className={styles.projectsContainer}>
      <div className={styles.projectsHeader}>
        <SearchInput
          onSearch={searchProjects}
          loading={loading}
          placeholder="Search Projects..."
        />

        <div className={styles.sortSelect}>
          <span>Sort by activity</span>
          <ChevronDown
            className={styles.sortSelectIcon}
            aria-hidden="true"
          />
        </div>

        <Link
          href={
            organizationId
              ? urlgen('organizations/[organizationId]/projects/new', {
                  organizationId: organizationId.toString(),
                })
              : urlgen('organizations/new')
          }
          className={styles.newProjectButton}
        >
          New Project
        </Link>
      </div>

      {projects === null || projects.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No projects found.</p>
          <p>Create a new project to get started.</p>
        </div>
      ) : (
        <div className={styles.projectsGrid}>
          {projects.map((project) => (
            <ProjectItem key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}
