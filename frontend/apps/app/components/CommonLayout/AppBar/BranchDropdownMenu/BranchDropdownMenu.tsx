'use client'

import { useRouter } from 'next/navigation'
import type { FC } from 'react'
import { BranchCombobox } from '@/components/shared/BranchCombobox'
import { urlgen } from '@/libs/routes'
import styles from './BranchDropdownMenu.module.css'
import { getBranches } from './services/getBranches'

type Props = {
  currentProjectId: string
  currentBranchOrCommit: string
}

export const BranchDropdownMenu: FC<Props> = async ({
  currentProjectId,
  currentBranchOrCommit,
}) => {
  const branches = await getBranches(currentProjectId)
  const currentBranch = branches.find(
    (branch) => branch.name === currentBranchOrCommit,
  )

  if (currentBranch == null) {
    return null
  }

  const comboboxBranches = branches.map((branch) => ({
    name: branch.name,
    sha: branch.name,
    protected: branch.protected,
  }))

  return (
    <BranchDropdownMenuClient
      branches={comboboxBranches}
      currentBranchName={currentBranch.name}
      currentProjectId={currentProjectId}
    />
  )
}

type ClientProps = {
  branches: Array<{ name: string; sha: string; protected: boolean }>
  currentBranchName: string
  currentProjectId: string
}

const BranchDropdownMenuClient: FC<ClientProps> = ({
  branches,
  currentBranchName,
  currentProjectId,
}) => {
  const router = useRouter()

  const handleBranchChange = (branchName: string) => {
    router.push(
      urlgen('projects/[projectId]/ref/[branchOrCommit]', {
        projectId: currentProjectId,
        branchOrCommit: branchName,
      }),
    )
  }

  return (
    <BranchCombobox
      branches={branches}
      selectedBranchSha={currentBranchName}
      onBranchChange={handleBranchChange}
      placeholder="Search branches..."
      className={styles.trigger}
    />
  )
}
