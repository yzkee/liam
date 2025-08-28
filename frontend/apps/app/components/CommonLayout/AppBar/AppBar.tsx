import type { FC } from 'react'
import { ChevronRight } from '@/icons'
import styles from './AppBar.module.css'
import { BranchDropdownMenu } from './BranchDropdownMenu'
import { ProjectsDropdownMenu } from './ProjectsDropdownMenu'
import { getAuthUser } from './services/getAuthUser'
import { UserDropdown } from './UserDropdown'

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
  const userName =
    authUser.user?.user_metadata?.full_name ||
    authUser.user?.user_metadata?.name
  const userEmail = authUser.user?.email
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
      </div>
      <div className={styles.rightSection}>
        <UserDropdown
          avatarUrl={avatarUrl}
          userName={userName}
          userEmail={userEmail}
        />
      </div>
    </div>
  )
}
