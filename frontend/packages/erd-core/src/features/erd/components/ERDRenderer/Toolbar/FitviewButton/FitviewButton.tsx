import { type IconButton, Scan } from '@liam-hq/ui'
import {
  type ComponentProps,
  type FC,
  type ReactNode,
  useCallback,
} from 'react'
import { toolbarActionLogEvent } from '@/features/gtm/utils'
import { useCustomReactflow } from '@/features/reactflow/hooks'
import { useVersion } from '@/providers'
import { useUserEditing } from '@/stores'
import { ToolbarIconButton } from '../ToolbarIconButton'

type FitviewButtonProps = {
  children?: ReactNode
  size?: ComponentProps<typeof IconButton>['size']
}

export const FitviewButton: FC<FitviewButtonProps> = ({
  children = '',
  size = 'md',
}) => {
  const { fitView } = useCustomReactflow()
  const userEditingResult = useUserEditing()
  if (userEditingResult.isErr()) {
    throw userEditingResult.error
  }
  const { showMode } = userEditingResult.value
  const versionResult = useVersion()
  if (versionResult.isErr()) {
    throw versionResult.error
  }
  const { version } = versionResult.value

  const handleClick = useCallback(() => {
    toolbarActionLogEvent({
      element: 'fitview',
      showMode,
      platform: version.displayedOn,
      gitHash: version.gitHash,
      ver: version.version,
      appEnv: version.envName,
    })
    fitView()
  }, [fitView, showMode, version])

  return (
    <ToolbarIconButton
      onClick={handleClick}
      size={size}
      tooltipContent="Zoom to Fit"
      label="Zoom to fit"
      icon={<Scan />}
    >
      {children}
    </ToolbarIconButton>
  )
}
