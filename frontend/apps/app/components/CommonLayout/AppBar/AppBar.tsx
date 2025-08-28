import { BaseAppBar, ChevronRight } from '@liam-hq/ui'
import styles from './AppBar.module.css'
import { BranchDropdownMenu } from './BranchDropdownMenu'
import { ProjectsDropdownMenu } from './ProjectsDropdownMenu'
import { getAuthUser } from './services/getAuthUser'
import { UserDropdown } from './UserDropdown'

type Props = {
  currentProjectId?: string
  currentBranchOrCommit?: string
}

export const AppBar = async ({
  currentProjectId,
  currentBranchOrCommit,
}: Props) => {
  const { data: authUser } = await getAuthUser()

  const avatarUrl = authUser.user?.user_metadata?.avatar_url
  return (
    <BaseAppBar
      leftContent={
        currentProjectId && (
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
        )
      }
      rightContent={avatarUrl && <UserDropdown avatarUrl={avatarUrl} />}
    />
  )
}
