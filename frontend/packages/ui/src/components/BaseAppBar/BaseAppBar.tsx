import { clsx } from 'clsx'
import type { FC, ReactNode } from 'react'
import styles from './BaseAppBar.module.css'

export type BaseAppBarProps = {
  leftContent?: ReactNode
  rightContent?: ReactNode
  className?: string
  leftSectionClassName?: string
}

export const BaseAppBar: FC<BaseAppBarProps> = ({
  leftContent,
  rightContent,
  className,
  leftSectionClassName,
}) => {
  return (
    <div className={clsx(styles.wrapper, className)}>
      {leftContent && (
        <div className={clsx(styles.leftSection, leftSectionClassName)}>
          {leftContent}
        </div>
      )}
      {rightContent && (
        <div className={styles.rightSection}>{rightContent}</div>
      )}
    </div>
  )
}
