import clsx from 'clsx'
import type { FC, ReactNode } from 'react'
import styles from './BaseGlobalNav.module.css'

export type BaseGlobalNavProps = {
  logoSection: ReactNode
  navContent?: ReactNode
  footerContent?: ReactNode
  className?: string
  disableHover?: boolean
}

export const BaseGlobalNav: FC<BaseGlobalNavProps> = ({
  logoSection,
  navContent,
  footerContent,
  className,
  disableHover = false,
}) => {
  return (
    <div
      className={styles.globalNavContainer}
      data-global-nav-container
      data-disable-hover={disableHover || undefined}
    >
      <nav className={clsx(styles.globalNav, className)}>
        <div className={styles.logoContainer}>
          <div className={styles.logoSection}>{logoSection}</div>
        </div>
        {navContent && <div className={styles.navSection}>{navContent}</div>}
        {footerContent && (
          <div className={styles.footerSection}>{footerContent}</div>
        )}
      </nav>
    </div>
  )
}
