import { BaseAppBar } from '@liam-hq/ui'
import type { FC } from 'react'
import styles from './PublicAppBar.module.css'

export const PublicAppBar: FC = () => {
  return (
    <BaseAppBar
      className={styles.customPublicAppBar}
      leftContent={
        <div className={styles.publicBadge}>
          <span className={styles.icon}>🌐</span>
          <span className={styles.publicText}>Public</span>
        </div>
      }
    />
  )
}
