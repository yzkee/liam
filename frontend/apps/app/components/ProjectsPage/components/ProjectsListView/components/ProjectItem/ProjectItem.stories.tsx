import type { Tables } from '@liam-hq/db/supabase/database.types'
import { GithubLogo } from '@liam-hq/ui'
import type { Meta, StoryObj } from '@storybook/nextjs'
import Link from 'next/link'
import type { FC } from 'react'
import { urlgen } from '../../../../../../libs/routes'
import { formatDate } from '../../../../../../libs/utils'
import { ProjectIcon } from '../../../../../ProjectIcon'
import { OrganizationIcon } from './OrganizationIcon'
import styles from './ProjectItem.module.css'

// Mock wrapper components for Storybook to avoid server action calls
const MockOrganizationDataWrapper: FC<{
  installationId: number
  owner: string
  repo: string
}> = ({ owner }) => (
  <OrganizationIcon
    avatarUrl="https://avatars.githubusercontent.com/u/1234567?v=4"
    owner={owner}
  />
)

const MockLastCommitDataWrapper: FC<{
  installationId: number
  owner: string
  repo: string
  defaultDate: string
}> = ({ defaultDate }) => (
  <>
    <span>John Doe</span>
    <span>committed</span>
    <span>on {formatDate(defaultDate)}</span>
  </>
)

// Storybook version of ProjectItem that uses mock components
type ProjectWithRepositories = Tables<'projects'> & {
  project_repository_mappings?: Array<{
    repository: Tables<'github_repositories'>
  }>
}

type ProjectItemProps = {
  project: ProjectWithRepositories
}

const ProjectItemForStorybook: FC<ProjectItemProps> = ({ project }) => {
  const repositoryName = project.name?.toLowerCase() || 'untitled-project'
  const repository = project.project_repository_mappings?.[0]?.repository

  return (
    <Link
      href={urlgen('projects/[projectId]', {
        projectId: `${project.id}`,
      })}
      className={styles.projectItem}
    >
      <div className={styles.projectHeader}>
        <div className={styles.projectIcon}>
          <div className={styles.projectIconPlaceholder}>
            {repository ? (
              <MockOrganizationDataWrapper
                installationId={repository.github_installation_identifier}
                owner={repository.owner}
                repo={repository.name}
              />
            ) : (
              <ProjectIcon className={styles.projectIcon} />
            )}
          </div>
        </div>
        <h2 className={styles.projectName}>{project.name}</h2>
      </div>

      <div className={styles.projectInfo}>
        <div className={styles.repositoryBadge}>
          <GithubLogo className={styles.repositoryIcon} />
          <span className={styles.repositoryName}>
            {repository
              ? `${repository.owner}/${repository.name}`
              : repositoryName}
          </span>
        </div>

        <div className={styles.commitInfo}>
          {repository ? (
            <MockLastCommitDataWrapper
              installationId={repository.github_installation_identifier}
              owner={repository.owner}
              repo={repository.name}
              defaultDate={project.created_at}
            />
          ) : (
            <>
              <span>User</span>
              <span>committed</span>
              <span>on {formatDate(project.created_at)}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  )
}

const meta = {
  component: ProjectItemForStorybook,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '400px' }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    project: {
      description: 'Project data including repository mappings',
    },
  },
} satisfies Meta<typeof ProjectItemForStorybook>

export default meta
type Story = StoryObj<typeof ProjectItemForStorybook>

export const WithRepository: Story = {
  args: {
    project: {
      id: 'project-1',
      name: 'Main Application',
      created_at: '2024-01-15T10:30:00Z',
      updated_at: '2024-01-15T10:30:00Z',
      organization_id: 'org-1',
      project_repository_mappings: [
        {
          repository: {
            id: 'repo-1',
            name: 'main-app',
            owner: 'acme-corp',
            github_installation_identifier: 12345,
            github_repository_identifier: 67890,
            organization_id: 'org-1',
            created_at: '2024-01-15T10:30:00Z',
            updated_at: '2024-01-15T10:30:00Z',
          },
        },
      ],
    },
  },
}

export const WithoutRepository: Story = {
  args: {
    project: {
      id: 'project-2',
      name: 'Demo Project',
      created_at: '2024-02-20T14:45:00Z',
      updated_at: '2024-02-20T14:45:00Z',
      organization_id: 'org-1',
    },
  },
}

export const LongProjectName: Story = {
  args: {
    project: {
      id: 'project-3',
      name: 'Very Long Project Name That Might Need Truncation',
      created_at: '2024-03-10T08:15:00Z',
      updated_at: '2024-03-10T08:15:00Z',
      organization_id: 'org-1',
      project_repository_mappings: [
        {
          repository: {
            id: 'repo-3',
            name: 'long-repository-name',
            owner: 'very-long-organization-name',
            github_installation_identifier: 78901,
            github_repository_identifier: 23456,
            organization_id: 'org-1',
            created_at: '2024-03-10T08:15:00Z',
            updated_at: '2024-03-10T08:15:00Z',
          },
        },
      ],
    },
  },
}
