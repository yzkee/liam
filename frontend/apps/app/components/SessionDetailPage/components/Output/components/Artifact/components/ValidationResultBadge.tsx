'use client'

import type { DmlExecutionLog } from '@liam-hq/artifact'
import { RoundBadge } from '@liam-hq/ui'
import type { FC } from 'react'
import styles from './ValidationResultBadge.module.css'

type Props = {
  success: boolean
  executionLogs: DmlExecutionLog[]
}

export const ValidationResultBadge: FC<Props> = ({
  success,
  executionLogs,
}) => {
  const variant = success ? 'green' : 'default'
  const text = success ? '✅ Success' : '❌ Failed'

  return (
    <RoundBadge
      variant={variant}
      className={styles.badge}
      title={`${executionLogs.length} execution log(s)`}
    >
      {text}
    </RoundBadge>
  )
}
