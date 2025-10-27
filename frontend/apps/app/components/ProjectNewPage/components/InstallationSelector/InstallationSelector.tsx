'use client'

import type { Installation, Repository } from '@liam-hq/github'
import {
  type FC,
  useActionState,
  useCallback,
  useEffect,
  useState,
  useTransition,
} from 'react'
import { match, P } from 'ts-pattern'
import { addProject } from './actions/addProject'
import { getRepositories } from './actions/getRepositories'
import { EmptyStateCard } from './components/EmptyStateCard'
import { HeaderActions } from './components/HeaderActions'
import { RepositoryList } from './components/RepositoryList'
import { RepositoryListSkeleton } from './components/RepositoryListSkeleton'
import styles from './InstallationSelector.module.css'

type Props = {
  installations: Installation[]
  organizationId: string
  needsRefresh?: boolean
}

type EmptyStateVariant = 'connect' | 'reauth'

export const InstallationSelector: FC<Props> = ({
  installations,
  organizationId,
  needsRefresh = false,
}) => {
  const [selectedInstallation, setSelectedInstallation] =
    useState<Installation | null>(() => {
      if (needsRefresh) {
        return null
      }

      return installations[0] ?? null
    })
  const [isAddingProject, startAddingProjectTransition] = useTransition()
  const [, startTransition] = useTransition()

  const [repositoriesState, repositoriesAction, isRepositoriesLoading] =
    useActionState(getRepositories, { repositories: [], loading: true })
  const githubAppUrl = process.env.NEXT_PUBLIC_GITHUB_APP_URL

  const hasInstallations = installations.length > 0

  const emptyStateVariant: EmptyStateVariant | null = needsRefresh
    ? 'reauth'
    : hasInstallations
      ? null
      : 'connect'

  const showRepositoriesSkeleton =
    isRepositoriesLoading || repositoriesState.loading
  const shouldShowSkeleton = !emptyStateVariant && showRepositoriesSkeleton

  const handleInstallApp = useCallback(() => {
    if (!githubAppUrl) return
    window.open(githubAppUrl, '_blank', 'noopener,noreferrer')
  }, [githubAppUrl])

  const handleConnectGitHub = useCallback(() => {
    handleInstallApp()
  }, [handleInstallApp])

  const handleSelectInstallation = useCallback(
    (installation: Installation) => {
      if (needsRefresh) return

      setSelectedInstallation(installation)
    },
    [needsRefresh],
  )

  useEffect(() => {
    if (needsRefresh) {
      if (selectedInstallation !== null) {
        setSelectedInstallation(null)
      }
      return
    }

    if (installations.length === 0) {
      if (selectedInstallation !== null) {
        setSelectedInstallation(null)
      }
      return
    }

    if (
      selectedInstallation &&
      installations.some(
        (installation) => installation.id === selectedInstallation.id,
      )
    ) {
      return
    }

    const nextInstallation = installations[0] ?? null
    setSelectedInstallation(nextInstallation)
  }, [installations, needsRefresh, selectedInstallation])

  useEffect(() => {
    if (!selectedInstallation || needsRefresh) {
      return
    }

    startTransition(() => {
      startAddingProjectTransition(() => {
        const formData = new FormData()
        formData.append('installationId', selectedInstallation.id.toString())
        repositoriesAction(formData)
      })
    })
  }, [needsRefresh, repositoriesAction, selectedInstallation])

  const handleSelectRepository = useCallback(
    async (repository: Repository) => {
      startAddingProjectTransition(async () => {
        try {
          const formData = new FormData()
          formData.set('projectName', repository.name)
          formData.set('repositoryName', repository.name)
          formData.set('repositoryOwner', repository.owner.login)
          formData.set('repositoryIdentifier', repository.id.toString())
          formData.set(
            'installationId',
            selectedInstallation?.id.toString() || '',
          )
          formData.set('organizationId', organizationId.toString())

          await addProject(formData)
        } catch (error) {
          console.error('Error adding project:', error)
        }
      })
    },
    [selectedInstallation, organizationId],
  )

  const dropdownLabel = selectedInstallation
    ? match(selectedInstallation.account)
        .with({ login: P.string }, (item) => item.login)
        .otherwise(() => 'Select installation')
    : 'Select installation'

  return (
    <section className={styles.container}>
      <HeaderActions
        needsRefresh={needsRefresh}
        installations={installations}
        selectedInstallationLabel={dropdownLabel}
        onSelectInstallation={handleSelectInstallation}
        onInstallApp={handleInstallApp}
        hasGithubAppUrl={!!githubAppUrl}
      />

      <div className={styles.panel}>
        <div className={styles.panelContent}>
          {shouldShowSkeleton ? (
            <RepositoryListSkeleton />
          ) : emptyStateVariant ? (
            <EmptyStateCard
              variant={emptyStateVariant}
              onActionClick={handleConnectGitHub}
              actionDisabled={!githubAppUrl}
            />
          ) : (
            <RepositoryList
              repositories={repositoriesState.repositories}
              error={repositoriesState.error}
              isAddingProject={isAddingProject}
              hasSelectedInstallation={Boolean(selectedInstallation)}
              onSelectRepository={handleSelectRepository}
            />
          )}
        </div>
      </div>
    </section>
  )
}
