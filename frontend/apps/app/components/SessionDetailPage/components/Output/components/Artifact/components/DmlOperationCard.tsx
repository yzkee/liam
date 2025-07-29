'use client'

import type { DmlOperation } from '@liam-hq/artifact'
import type { FC } from 'react'
import styles from './DmlOperationCard.module.css'
import { SqlCodeBlock } from './SqlCodeBlock'
import { ValidationResultBadge } from './ValidationResultBadge'

type Props = {
  operation: DmlOperation
  index: number
}

export const DmlOperationCard: FC<Props> = ({ operation, index }) => {
  const hasExecutionLogs = operation.dml_execution_logs.length > 0
  const latestLog = hasExecutionLogs
    ? operation.dml_execution_logs[operation.dml_execution_logs.length - 1]
    : null

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.operationType}>
          <span className={styles.operationLabel}>
            {index + 1}. {operation.operation_type}
          </span>
          {latestLog && (
            <ValidationResultBadge
              success={latestLog.success}
              executionLogs={operation.dml_execution_logs}
            />
          )}
        </div>
      </div>

      <SqlCodeBlock sql={operation.sql} />

      {hasExecutionLogs && (
        <div className={styles.executionLogs}>
          <h6 className={styles.logsTitle}>Execution Logs:</h6>
          <div className={styles.logsList}>
            {operation.dml_execution_logs.map((log, logIndex) => (
              <div
                key={`${log.executed_at}-${logIndex}`}
                className={styles.logEntry}
              >
                <span className={styles.logTimestamp}>
                  {new Date(log.executed_at).toLocaleString()}
                </span>
                <ValidationResultBadge
                  success={log.success}
                  executionLogs={[log]}
                />
                <span className={styles.logSummary}>{log.result_summary}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
