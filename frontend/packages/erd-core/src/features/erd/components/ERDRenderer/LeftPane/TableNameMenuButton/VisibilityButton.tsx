import { Eye, EyeClosed, SidebarMenuAction } from '@liam-hq/ui'
import { type FC, type MouseEvent, useCallback } from 'react'
import { toggleLogEvent } from '@/features/gtm/utils'
import { useCustomReactflow } from '@/features/reactflow/hooks'
import { useVersion } from '@/providers'
import { useUserEditing } from '@/stores'
import styles from './VisibilityButton.module.css'

type Props = {
  tableName: string
  hidden?: boolean | undefined
}

export const VisibilityButton: FC<Props> = ({ tableName, hidden }) => {
  const userEditingResult = useUserEditing()
  const { toggleHiddenNodeId } = userEditingResult.match(
    (val) => val,
    (error) => {
      throw error
    },
  )
  const { updateNode } = useCustomReactflow()
  const versionResult = useVersion()
  const { version } = versionResult.match(
    (val) => val,
    (error) => {
      throw error
    },
  )

  const handleClick = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation()
      toggleHiddenNodeId(tableName)
      updateNode(tableName, { hidden: !hidden })

      toggleLogEvent({
        element: 'tableNameMenuButton',
        isShow: !!hidden,
        tableId: tableName,
        platform: version.displayedOn,
        gitHash: version.gitHash,
        ver: version.version,
        appEnv: version.envName,
      })
    },
    [tableName, hidden, updateNode, toggleHiddenNodeId, version],
  )

  return (
    <SidebarMenuAction
      showOnHover
      onClick={handleClick}
      aria-label={hidden ? 'Show Table' : 'Hide Table'}
    >
      {hidden ? (
        <EyeClosed className={styles.icon} />
      ) : (
        <Eye className={styles.icon} />
      )}
    </SidebarMenuAction>
  )
}
