import type { Installation } from '@liam-hq/github'
import { Button, Plus } from '@liam-hq/ui'
import type { FC } from 'react'
import styles from './HeaderActions.module.css'
import { InstallationDropdown } from './InstallationDropdown'

type HeaderActionsProps = {
  needsRefresh: boolean
  installations: Installation[]
  selectedInstallationLabel: string
  onSelectInstallation: (installation: Installation) => void
  onInstallApp: () => void
  hasGithubAppUrl: boolean
}

export const HeaderActions: FC<HeaderActionsProps> = ({
  needsRefresh,
  installations,
  selectedInstallationLabel,
  onSelectInstallation,
  onInstallApp,
  hasGithubAppUrl,
}) => {
  return (
    <div className={styles.actions}>
      <InstallationDropdown
        installations={installations}
        disabled={needsRefresh}
        selectedLabel={selectedInstallationLabel}
        onSelect={onSelectInstallation}
      />
      <Button
        size="md"
        variant="outline-secondary"
        onClick={onInstallApp}
        disabled={!hasGithubAppUrl || needsRefresh}
        className={styles.installButton}
        leftIcon={<Plus aria-hidden focusable="false" />}
      >
        Configure Repositories on GitHub
      </Button>
    </div>
  )
}
