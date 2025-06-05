import { AvatarWithImage } from '@/components'
<<<<<<< HEAD
import { NewSessionButton } from '@/components/Chat/NewSessionButton/NewSessionButton'
||||||| 0fbe3653
import { NewThreadButton } from '@/components/Chat/NewThreadButton/NewThreadButton'
=======
>>>>>>> origin/main
import { ChevronRight } from '@/icons'
import type { FC } from 'react'
import styles from './AppBar.module.css'
import { BranchDropdownMenu } from './BranchDropdownMenu'
import { ProjectsDropdownMenu } from './ProjectsDropdownMenu'
import { getAuthUser } from './services/getAuthUser'

type Props = {
  currentProjectId?: string
  currentBranchOrCommit?: string
}

export const AppBar: FC<Props> = async ({
  currentProjectId,
  currentBranchOrCommit,
}) => {
  const { data: authUser } = await getAuthUser()

  const avatarUrl = authUser.user?.user_metadata?.avatar_url
  return (
    <div className={styles.wrapper}>
      <div className={styles.leftSection}>
        {currentProjectId && (
          <div className={styles.breadcrumbs}>
            <ProjectsDropdownMenu currentProjectId={currentProjectId} />
            {currentBranchOrCommit && (
              <>
                <ChevronRight className={styles.chevronRight} />
                <BranchDropdownMenu
                  currentProjectId={currentProjectId}
                  currentBranchOrCommit={currentBranchOrCommit}
                />
              </>
            )}
          </div>
        )}
<<<<<<< HEAD
        {currentProjectId && (
          <a href={newSessionUrl} className={styles.newSessionButton}>
            <NewSessionButton size="sm" tooltipContent="New Session" />
          </a>
        )}
||||||| 0fbe3653
        {currentProjectId && (
          <a href={newSessionUrl} className={styles.newSessionButton}>
            <NewThreadButton size="sm" tooltipContent="New Session" />
          </a>
        )}
=======
>>>>>>> origin/main
      </div>
      <div className={styles.rightSection}>
        {avatarUrl && (
          <AvatarWithImage src={avatarUrl} alt="User profile" size="sm" />
        )}
      </div>
    </div>
  )
}
