import type { FC } from 'react'
import styles from './WorkflowRunningIndicator.module.css'

export const WorkflowRunningIndicator: FC = () => {
  return (
    <div className={styles.wrapper}>
      <div className={styles.dot} />
      <div className={styles.dot} />
      <div className={styles.dot} />
    </div>
  )
}
