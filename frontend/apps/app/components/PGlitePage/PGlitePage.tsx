'use client'

import { PGlite } from '@electric-sql/pglite'
import { useEffect, useRef, useState } from 'react'
import styles from './PGlitePage.module.css'

// 結果の型定義
interface SqlResult {
  sql: string
  result: { error?: string } | Record<string, unknown>
  success: boolean
  id: string
}

export function PGlitePage() {
  const [db, setDb] = useState<PGlite | null>(null)
  const [results, setResults] = useState<SqlResult[]>([])
  const [sqlInput, setSqlInput] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // 初期化
  useEffect(() => {
    const run = async () => {
      const db = new PGlite()
      setDb(db)
    }

    run()
  }, [])

  // 複数SQL文を分割して実行
  const executeSql = async () => {
    if (!db || !sqlInput.trim()) return

    // 1. ';' で区切って分割
    const statements = sqlInput
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    // 2. 各SQL文を順次実行
    for (const sql of statements) {
      try {
        const result = await db.query(sql)
        setResults((prev) => [
          ...prev,
          {
            sql,
            result,
            success: true,
            id: crypto.randomUUID(),
          },
        ])
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        setResults((prev) => [
          ...prev,
          {
            sql,
            result: { error: errorMessage },
            success: false,
            id: crypto.randomUUID(),
          },
        ])
      }
    }

    // 3. 入力フィールドをクリアしてフォーカス
    setSqlInput('')
    inputRef.current?.focus()
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>PGlite Playground</h1>

      <div
        className={`${styles.status} ${db ? styles.success : styles.loading}`}
      >
        {db ? 'PGlite データベース接続済み' : 'PGlite データベース接続中...'}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <p>
          複数のSQL文を一度に実行できます。各SQL文は<code>;</code>
          （セミコロン）で区切ってください。
        </p>
        <textarea
          ref={inputRef}
          rows={5}
          style={{
            width: '100%',
            fontFamily: 'var(--code-font)',
            padding: '0.5rem',
          }}
          placeholder="CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT);
INSERT INTO users (name) VALUES ('Taro'), ('Jiro');
SELECT * FROM users;"
          value={sqlInput}
          onChange={(e) => setSqlInput(e.target.value)}
        />
        <button
          type="button"
          onClick={executeSql}
          style={{ marginTop: '0.5rem' }}
        >
          実行
        </button>
      </div>

      <div>
        {results.map(({ sql, result, success, id }) => (
          <div key={id} className={styles.resultContainer}>
            <div className={styles.sqlCommand}>{sql}</div>
            <pre
              className={`${styles.resultPre} ${success ? '' : styles.error}`}
            >
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  )
}
