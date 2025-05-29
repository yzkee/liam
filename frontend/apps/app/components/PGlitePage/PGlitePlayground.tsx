'use client'

import { PGlite } from '@electric-sql/pglite'
import { useEffect, useState } from 'react'
import styles from './PGlitePage.module.css'

// 結果の型定義
interface SqlResult {
  sql: string
  result: { error?: string } | Record<string, unknown>
  success: boolean
  id: string
  // 将来的な拡張のためのフィールド
  metadata?: {
    executionTime?: number // 実行時間（ミリ秒）
    affectedRows?: number // 影響を受けた行数
    timestamp?: string // 実行タイムスタンプ
  }
}

// DDLセクション用の状態
interface DDLState {
  ddlInput: string
  results: SqlResult[]
}

// DMLセクション用の状態（各セクションが独立）
interface DMLSection {
  id: string
  dmlInput: string
  results: SqlResult[]
  db: PGlite | null // 各DMLセクションは独自のPGliteインスタンスを持つ
}

/**
 * DDL実行関数（グローバルに影響）
 * テキストを分割して各SQL文を実行し、結果を返す
 */
const applyDDL = async (ddlText: string, db: PGlite): Promise<SqlResult[]> => {
  const results: SqlResult[] = []

  // ';' で区切って分割
  const statements = ddlText
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)

  // 各SQL文を順次実行
  for (const sql of statements) {
    const startTime = performance.now()
    try {
      const result = await db.query(sql)
      const executionTime = Math.round(performance.now() - startTime)
      results.push({
        sql,
        result,
        success: true,
        id: crypto.randomUUID(),
        metadata: {
          executionTime,
          timestamp: new Date().toLocaleString(),
        },
      })
    } catch (error) {
      const executionTime = Math.round(performance.now() - startTime)
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      results.push({
        sql,
        result: { error: errorMessage },
        success: false,
        id: crypto.randomUUID(),
        metadata: {
          executionTime,
          timestamp: new Date().toLocaleString(),
        },
      })
    }
  }

  return results
}

/**
 * DML実行関数（各ユースケース用）
 * テキストを分割して各SQL文を実行し、結果を返す
 */
const applyDML = async (dmlText: string, db: PGlite): Promise<SqlResult[]> => {
  const results: SqlResult[] = []

  // ';' で区切って分割
  const statements = dmlText
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)

  // 各SQL文を順次実行
  for (const sql of statements) {
    const startTime = performance.now()
    try {
      const result = await db.query(sql)
      const executionTime = Math.round(performance.now() - startTime)

      // 影響を受けた行数を取得（可能な場合）
      let affectedRows: number | undefined = undefined
      if (result && typeof result === 'object' && 'rowCount' in result) {
        affectedRows = result.rowCount as number
      }

      results.push({
        sql,
        result,
        success: true,
        id: crypto.randomUUID(),
        metadata: {
          executionTime,
          affectedRows,
          timestamp: new Date().toLocaleString(),
        },
      })
    } catch (error) {
      const executionTime = Math.round(performance.now() - startTime)
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      results.push({
        sql,
        result: { error: errorMessage },
        success: false,
        id: crypto.randomUUID(),
        metadata: {
          executionTime,
          timestamp: new Date().toLocaleString(),
        },
      })
    }
  }

  return results
}

// 結果表示コンポーネント（アコーディオン形式）
const QueryResultBox = ({ result }: { result: SqlResult }) => {
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

export function PGlitePlayground() {
  // グローバルDB（DDL用）
  const [globalDb, setGlobalDb] = useState<PGlite | null>(null)

  // DDLセクションの状態
  const [ddlState, setDdlState] = useState<DDLState>({
    ddlInput: '',
    results: [],
  })

  // DMLセクションの状態（複数）
  const [dmlSections, setDmlSections] = useState<DMLSection[]>([])

  // 初期化
  useEffect(() => {
    const initializeDb = async () => {
      const db = new PGlite()
      setGlobalDb(db)

      // 初期DMLセクションを1つ追加
      addDMLSection(db)
    }

    initializeDb()
  }, [])

  // DDL入力の更新
  const updateDdlInput = (value: string) => {
    setDdlState((prev) => ({
      ...prev,
      ddlInput: value,
    }))
  }

  // DML入力の更新
  const updateDmlInput = (sectionId: string, value: string) => {
    setDmlSections((prev) =>
      prev.map((section) =>
        section.id === sectionId ? { ...section, dmlInput: value } : section,
      ),
    )
  }

  // DDL実行
  const executeDDL = async () => {
    if (!globalDb || !ddlState.ddlInput.trim()) return

    // DDLを実行して結果を保存
    const results = await applyDDL(ddlState.ddlInput, globalDb)
    setDdlState((prev) => ({
      ...prev,
      results: [...prev.results, ...results],
    }))

    // DDL実行後、全てのDMLセクションのDBを更新
    updateAllDmlSections()
  }

  // 全DMLセクションのDBを更新（DDL変更後）
  const updateAllDmlSections = async () => {
    if (!globalDb) return

    // 各DMLセクションに対して新しいDBインスタンスを作成し、DDLを適用
    const updatedSections = await Promise.all(
      dmlSections.map(async (section) => {
        const newDb = new PGlite()

        // 現在のDDLを新しいDBインスタンスに適用
        if (ddlState.ddlInput) {
          await applyDDL(ddlState.ddlInput, newDb)
        }

        return {
          ...section,
          db: newDb,
        }
      }),
    )

    setDmlSections(updatedSections)
  }

  // DMLセクション追加
  const addDMLSection = async (initialDb?: PGlite) => {
    const newDb = initialDb || new PGlite()

    // 新しいDBインスタンスに現在のDDLを適用
    if (ddlState.ddlInput) {
      await applyDDL(ddlState.ddlInput, newDb)
    }

    setDmlSections((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        dmlInput: '',
        results: [],
        db: newDb,
      },
    ])
  }

  // DML実行（特定のセクションに対して）
  const executeDML = async (sectionId: string) => {
    const sectionIndex = dmlSections.findIndex((s) => s.id === sectionId)
    if (sectionIndex === -1) return

    const section = dmlSections[sectionIndex]
    if (!section.db || !section.dmlInput.trim()) return

    // DMLを実行して結果を保存
    const results = await applyDML(section.dmlInput, section.db)

    setDmlSections((prev) => {
      const newSections = [...prev]
      newSections[sectionIndex] = {
        ...newSections[sectionIndex],
        results: [...newSections[sectionIndex].results, ...results],
        dmlInput: '', // 入力をクリア
      }
      return newSections
    })
  }

  // DMLセクション削除
  const removeDMLSection = (sectionId: string) => {
    setDmlSections((prev) => prev.filter((section) => section.id !== sectionId))
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>PGlite Playground</h1>

      <div
        className={`${styles.status} ${globalDb ? styles.success : styles.loading}`}
      >
        {globalDb
          ? 'PGlite データベース接続済み'
          : 'PGlite データベース接続中...'}
      </div>

      {/* DDL入力セクション（グローバル） */}
      <div style={{ marginBottom: '2rem' }}>
        <h2>DDL入力エリア（グローバル）</h2>
        <p>
          DDLを入力して実行すると、すべてのDMLフォームに反映されます。
          複数のSQL文を一度に実行できます。各SQL文は<code>;</code>
          （セミコロン）で区切ってください。
        </p>
        <textarea
          rows={5}
          style={{
            width: '100%',
            fontFamily: 'var(--code-font)',
            padding: '0.5rem',
          }}
          placeholder="CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT);
CREATE TABLE posts (id SERIAL PRIMARY KEY, title TEXT, user_id INTEGER REFERENCES users(id));"
          value={ddlState.ddlInput}
          onChange={(e) => updateDdlInput(e.target.value)}
        />
        <button
          type="button"
          onClick={executeDDL}
          style={{ marginTop: '0.5rem' }}
        >
          DDLを実行
        </button>

        {/* DDL実行結果 */}
        <div>
          {ddlState.results.map((result) => (
            <QueryResultBox key={result.id} result={result} />
          ))}
        </div>
      </div>

      <hr style={{ margin: '2rem 0' }} />

      {/* DMLセクション（複数） */}
      <div>
        <h2>DMLユースケースセクション</h2>
        <p>
          各DMLフォームは独立した環境で実行されます。
          他のフォームの実行結果に影響されることはありません。
        </p>

        {dmlSections.map((section) => (
          <div
            key={section.id}
            style={{
              marginBottom: '2rem',
              padding: '1rem',
              border: '1px solid var(--global-border)',
              borderRadius: 'var(--border-radius-2)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3>DMLユースケース</h3>
              <button
                type="button"
                onClick={() => removeDMLSection(section.id)}
                style={{ padding: '0.25rem 0.5rem' }}
              >
                削除
              </button>
            </div>

            <textarea
              rows={4}
              style={{
                width: '100%',
                fontFamily: 'var(--code-font)',
                padding: '0.5rem',
              }}
              placeholder="INSERT INTO users (name) VALUES ('Taro'), ('Jiro');
SELECT * FROM users;"
              value={section.dmlInput}
              onChange={(e) => updateDmlInput(section.id, e.target.value)}
            />
            <button
              type="button"
              onClick={() => executeDML(section.id)}
              style={{ marginTop: '0.5rem' }}
            >
              実行
            </button>

            {/* DML実行結果 */}
            <div>
              {section.results.map((result) => (
                <QueryResultBox key={result.id} result={result} />
              ))}
            </div>
          </div>
        ))}

        {/* DMLフォーム追加ボタン */}
        <button
          type="button"
          onClick={() => addDMLSection()}
          style={{ marginBottom: '2rem' }}
        >
          ＋ DMLフォームを追加
        </button>
      </div>
    </div>
  )
}
