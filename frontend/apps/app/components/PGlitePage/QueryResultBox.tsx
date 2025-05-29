'use client'

import { useState } from 'react'
import styles from './PGlitePage.module.css'
import type { SqlResult } from './utils/types'

export const QueryResultBox = ({ result }: { result: SqlResult }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className={styles.queryResultBox}>
      {/* ステータスヘッダー - 常に表示 */}
      <button
        type="button"
        className={`${styles.resultHeader} ${result.success ? styles.successHeader : styles.errorHeader}`}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-label={`${result.success ? '成功' : '失敗'}したクエリの詳細を${isExpanded ? '閉じる' : '開く'}`}
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
          {result.success ? '成功しました' : '失敗しました'}
        </div>
        <div className={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</div>
      </button>

      {/* 詳細情報 - 展開時のみ表示 */}
      {isExpanded && (
        <div className={styles.resultDetails}>
          <div className={styles.sqlCommand}>{result.sql}</div>
          <pre
            className={`${styles.resultPre} ${result.success ? '' : styles.error}`}
          >
            {JSON.stringify(result.result, null, 2)}
          </pre>
          {/* 将来的な拡張のためのメタデータ表示エリア */}
          {result.metadata && (
            <div className={styles.metadataContainer}>
              {result.metadata.executionTime !== undefined && (
                <div>実行時間: {result.metadata.executionTime}ms</div>
              )}
              {result.metadata.affectedRows !== undefined && (
                <div>影響を受けた行数: {result.metadata.affectedRows}</div>
              )}
              {result.metadata.timestamp && (
                <div>実行日時: {result.metadata.timestamp}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
