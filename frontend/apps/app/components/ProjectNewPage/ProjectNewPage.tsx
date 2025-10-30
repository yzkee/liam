'use client'

import type { Installation, Repository } from '@liam-hq/github'
import { ArrowLeft, Button } from '@liam-hq/ui'
import Link from 'next/link'
import { type FC, useCallback, useState } from 'react'
import { urlgen } from '../../libs/routes'
import { TokenRefreshKick } from '../TokenRefreshKick'
import { InstallationSelector } from './components/InstallationSelector'
import { type Step, Stepper } from './components/Stepper'
import styles from './ProjectNewPage.module.css'

const steps: Step[] = [
  { label: 'Import Git Repository' },
  { label: 'Set Watch Schemas' },
]

type Props = {
  installations: Installation[]
  organizationId: string
  needsRefresh?: boolean
}

export const ProjectNewPage: FC<Props> = ({ installations, needsRefresh }) => {
  const [selectedRepository, setSelectedRepository] =
    useState<Repository | null>(null)

  const handleCancel = useCallback(() => {
    setSelectedRepository(null)
  }, [])

  return (
    <div className={styles.container}>
      <TokenRefreshKick trigger={needsRefresh} />
      <div className={styles.content}>
        <header className={styles.header}>
          <h1 className={styles.title}>Add New Project</h1>
          <div className={styles.stepperSection}>
            <Stepper steps={steps} activeIndex={selectedRepository ? 1 : 0} />
            {selectedRepository && (
              <div className={styles.buttons}>
                <Button
                  variant="outline-secondary"
                  size="md"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
                <Button variant="solid-primary" size="md">
                  Save
                </Button>
              </div>
            )}
          </div>
        </header>
        {selectedRepository ? (
          <div>Schema</div>
        ) : (
          <InstallationSelector
            installations={installations}
            needsRefresh={needsRefresh}
            onSelectRepository={setSelectedRepository}
          />
        )}
        <Link href={urlgen('projects')} className={styles.backLink}>
          <ArrowLeft aria-hidden className={styles.backIcon} />
          <span>Back to Projects</span>
        </Link>
      </div>
    </div>
  )
}
