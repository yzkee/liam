'use client'

import type { SqlResult } from '@liam-hq/pglite-server/src/types'
import clsx from 'clsx'
import type { FC } from 'react'
import styles from '../QueryResultMessage.module.css'

type Props = {
  result: SqlResult
}

export const QueryResultBox: FC<Props> = ({ result }) => {
  return (
    <div className={styles.queryResultBox}>
      <button
        type="button"
        className={clsx(
          styles.resultHeader,
          result.success ? styles.successHeader : styles.errorHeader,
        )}
        aria-label={`${result.success ? 'Successful' : 'Failed'} query details`}
      >
        <div className={styles.statusIndicator}>
          {result.success ? '✅' : '❌'}
        </div>
        <div className={styles.sqlPreview}>
          {result.sql.length > 50
            ? `${result.sql.substring(0, 50)}...`
            : result.sql}
        </div>
        <div className={styles.statusMessage}>
          {result.success ? 'Success' : 'Failed'}
        </div>
      </button>
      <div className={styles.resultDetails}>
        <div className={styles.sqlCommand}>{result.sql}</div>
        <pre
          className={clsx(styles.resultPre, result.success ? '' : styles.error)}
        >
          {JSON.stringify(result.result, null, 2)}
        </pre>
        {result.metadata && (
          <div className={styles.metadataContainer}>
            {result.metadata.executionTime !== undefined && (
              <div>Execution time: {result.metadata.executionTime}ms</div>
            )}
            {result.metadata.affectedRows !== undefined && (
              <div>Affected rows: {result.metadata.affectedRows}</div>
            )}
            {result.metadata.timestamp && (
              <div>Execution timestamp: {result.metadata.timestamp}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
