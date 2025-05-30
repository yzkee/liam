import { createClient } from '@/libs/db/server'
import { getRepositoryBranches } from '@liam-hq/github'
import Link from 'next/link'

import type { FC } from 'react'
import { urlgen } from '../../libs/routes/urlgen'
import styles from './ProjectBranchesListPage.module.css'

type Props = {
  projectId: string
}

async function getProjectAndBranches(projectId: string) {
  try {
    const supabase = await createClient()
    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        project_repository_mappings(
          github_repositories(
            id, name, owner, github_installation_identifier
          )
        )
      `)
      .eq('id', projectId)
      .single()

    if (error || !project) {
      throw new Error('Project not found')
    }

    const branchesByRepo = await Promise.all(
      project.project_repository_mappings.map(async (mapping) => {
        const repository = mapping.github_repositories
        const branches = await getRepositoryBranches(
          Number(repository.github_installation_identifier),
          repository.owner,
          repository.name,
        )

        return {
          repositoryId: repository.id,
          repositoryName: repository.name,
          repositoryOwner: repository.owner,
          branches: branches.map((branch) => ({
            name: branch.name,
          })),
        }
      }),
    )

    return {
      id: project.id,
      name: project.name,
      branchesByRepo,
    }
  } catch (error) {
    console.error('Error fetching project and branches:', error)
    throw new Error('Failed to fetch project and branches')
  }
}

export const ProjectBranchesListPage: FC<Props> = async ({ projectId }) => {
  const project = await getProjectAndBranches(projectId)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Link
            href={`/app/projects/${project.id}`}
            className={styles.backLink}
            aria-label="Back to project details"
          >
            ← Back to Project
          </Link>
          <h1 className={styles.title}>
            {project.name || 'Untitled Project'} - Branches
          </h1>
        </div>
      </div>

      <div className={styles.content}>
        {project.branchesByRepo.map((repo) => (
          <section key={repo.repositoryId} className={styles.repoSection}>
            <h2 className={styles.repoTitle}>
              {repo.repositoryOwner}/{repo.repositoryName}
            </h2>

            <ul className={styles.branchList}>
              {repo.branches.map((branch) => (
                <li key={branch.name} className={styles.branchItem}>
                  <Link
                    href={urlgen('projects/[projectId]/ref/[branchOrCommit]', {
                      projectId: project.id.toString(),
                      branchOrCommit: branch.name,
                    })}
                    className={styles.branchName}
                  >
                    {branch.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
