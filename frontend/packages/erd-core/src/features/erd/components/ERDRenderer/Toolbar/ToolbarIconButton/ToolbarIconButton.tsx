import { IconButton } from '@liam-hq/ui'
import { ToolbarButton } from '@radix-ui/react-toolbar'
import type { ComponentProps, FC, MouseEventHandler, ReactNode } from 'react'
import styles from './ToolBarIconButton.module.css'

interface ToolBarIconButtonProps {
  children?: ReactNode
  size?: ComponentProps<typeof IconButton>['size']
  tooltipContent: string
  label: string
  icon: ReactNode
  onClick?: MouseEventHandler
}

export const ToolBarIconButton: FC<ToolBarIconButtonProps> = ({
  children = '',
  size = 'md',
  tooltipContent,
  label,
  icon,
  onClick,
}) => {
  return (
    <ToolbarButton
      asChild
      className={
        children === '' ? styles.menuButton : styles.menuButtonWithText
      }
    >
      <IconButton
        icon={icon}
        tooltipContent={tooltipContent}
        onClick={onClick}
        size={size}
        aria-label={label}
      >
        {children}
      </IconButton>
    </ToolbarButton>
  )
}
