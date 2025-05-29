'use client'

import { loadScript } from '@/libs/utils/scriptLoader'
import { type FC, useEffect, useState } from 'react'
import styles from './PGlitePage.module.css'

type StatusType = 'loading' | 'success' | 'error'

// Define types for PGlite
interface PGliteInstance {
  initPostgres: () => Promise<PostgresDB>
}

interface PostgresDB {
  query: (sql: string) => Promise<unknown>
}

type ResultItem = {
  sql: string
  result: unknown
}

// Define global window interface for PGlite
declare global {
  interface Window {
    // biome-ignore lint/suspicious/noExplicitAny: External library without types
    pgliteModule?: any
    // biome-ignore lint/suspicious/noExplicitAny: External library without types
    createPGlite?: () => Promise<PGliteInstance>
  }
}

export const PGlitePage: FC = () => {
  const [status, setStatus] = useState<{ message: string; type: StatusType }>({
    message: 'PostgreSQL を初期化中...',
    type: 'loading',
  })
  const [results, setResults] = useState<ResultItem[]>([])

  // Function to display results
  const addResult = (sql: string, result: unknown) => {
    setResults((prev) => [...prev, { sql, result }])
  }

  // Main initialization and execution function
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    // Function to run when PGlite is ready
    const runPGlite = async () => {
      try {
        // biome-ignore lint/suspicious/noConsoleLog: Useful for debugging
        console.log('PGlite の実行を開始します...')

        if (!window.createPGlite) {
          throw new Error('createPGlite function not found on window object')
        }

        // Create PGlite instance
        const pglite = await window.createPGlite()

        // Initialize database connection
        const db = await pglite.initPostgres()
        // biome-ignore lint/suspicious/noConsoleLog: Useful for debugging
        console.log('PostgreSQL の初期化が完了しました')
        setStatus({
          message: 'PostgreSQL の初期化が完了しました',
          type: 'success',
        })

        // SQL commands to execute
        const sqlCommands = [
          'CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT)',
          "INSERT INTO users (name) VALUES ('Taro'), ('Jiro')",
          'SELECT * FROM users',
        ]

        // Execute each SQL command
        for (const sql of sqlCommands) {
          // biome-ignore lint/suspicious/noConsoleLog: Useful for debugging
          console.log(`SQL実行: ${sql}`)
          try {
            const result = await db.query(sql)
            // biome-ignore lint/suspicious/noConsoleLog: Useful for debugging
            console.log('実行結果:', result)
            addResult(sql, result)
          } catch (error) {
            console.error(`SQL実行エラー (${sql}):`, error)
            addResult(sql, { error: (error as Error).message })
          }
        }
      } catch (error) {
        console.error('PGlite 実行エラー:', error)
        setStatus({
          message: `エラー: ${(error as Error).message}`,
          type: 'error',
        })
      }
    }

    const initPGlite = async () => {
      try {
        // biome-ignore lint/suspicious/noConsoleLog: Useful for debugging
        console.log('PGlite の初期化を開始します...')
        setStatus({
          message: 'PostgreSQL を初期化中...',
          type: 'loading',
        })

        // Load our custom PGlite loader script
        await loadScript('/pglite/pglite-loader.js')

        // Set up event listeners before checking if createPGlite is available
        const handlePGliteReady = () => {
          // biome-ignore lint/suspicious/noConsoleLog: Useful for debugging
          console.log('PGlite ready event received')
          runPGlite()
          // Remove the event listener after it's triggered
          window.removeEventListener('pglite-ready', handlePGliteReady)
        }

        const handlePGliteError = (event: Event) => {
          const customEvent = event as CustomEvent<{ error: string }>
          const errorMessage = customEvent.detail?.error || 'Unknown error'
          console.error('PGlite error event received:', errorMessage)
          setStatus({
            message: `エラー: ${errorMessage}`,
            type: 'error',
          })
          // Remove the event listener after it's triggered
          window.removeEventListener('pglite-error', handlePGliteError)
        }

        // Add event listeners
        window.addEventListener('pglite-ready', handlePGliteReady)
        window.addEventListener('pglite-error', handlePGliteError)

        // Check if createPGlite is already available (might happen if script was already loaded)
        if (window.createPGlite) {
          // biome-ignore lint/suspicious/noConsoleLog: Useful for debugging
          console.log('createPGlite already available, running immediately')
          await runPGlite()
          // Remove event listeners since we're not using them
          window.removeEventListener('pglite-ready', handlePGliteReady)
          window.removeEventListener('pglite-error', handlePGliteError)
        } else {
          // biome-ignore lint/suspicious/noConsoleLog: Useful for debugging
          console.log('Waiting for PGlite to be ready...')

          // Set a timeout in case the event never fires
          const timeoutId = setTimeout(() => {
            window.removeEventListener('pglite-ready', handlePGliteReady)
            window.removeEventListener('pglite-error', handlePGliteError)
            setStatus({
              message: 'エラー: PGlite の読み込みがタイムアウトしました',
              type: 'error',
            })
          }, 10000) // 10 seconds timeout

          // Clean up the timeout if component unmounts
          return () => {
            clearTimeout(timeoutId)
            window.removeEventListener('pglite-ready', handlePGliteReady)
            window.removeEventListener('pglite-error', handlePGliteError)
          }
        }
      } catch (error) {
        console.error('PGlite 初期化エラー:', error)
        setStatus({
          message: `エラー: ${(error as Error).message}`,
          type: 'error',
        })
      }
    }

    initPGlite()
  }, [])

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>PGlite ブラウザテスト</h1>

      <div className={`${styles.status} ${styles[status.type]}`}>
        {status.message}
      </div>

      <div>
        {results.map((item, index) => (
          <div
            // Using SQL command as part of the key for more uniqueness
            key={`sql-${item.sql.substring(0, 10)}-${index}`}
            className={styles.resultContainer}
          >
            <div className={styles.sqlCommand}>{item.sql}</div>
            <pre className={styles.resultPre}>
              {JSON.stringify(item.result, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  )
}
