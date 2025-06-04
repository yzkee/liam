'use client'

import { PGlite } from '@electric-sql/pglite'
import { useEffect, useState } from 'react'
import { DDLInputSection } from './DDLInputSection'
import styles from './PGlitePage.module.css'
import { QueryResultBox } from './QueryResultBox'
import { applyDDL, applyDML } from './utils'
import type { DDLState, DMLSection } from './utils/types'

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

      {/* DDL入力セクション（グローバル） - コンポーネント化 */}
      <DDLInputSection
        ddlState={ddlState}
        updateDdlInput={updateDdlInput}
        executeDDL={executeDDL}
      />

      <div className={styles.divider} />

      {/* DMLセクション（複数） */}
      <div className={styles.playgroundSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>DMLユースケースセクション</h2>
        </div>
        <p className={styles.description}>
          各DMLフォームは独立した環境で実行されます。
          他のフォームの実行結果に影響されることはありません。
        </p>

        {dmlSections.map((section) => (
          <div key={section.id} className={styles.dmlSection}>
            <div className={styles.dmlHeader}>
              <h3 className={styles.dmlTitle}>DMLユースケース</h3>
              <button
                type="button"
                onClick={() => removeDMLSection(section.id)}
                className={`${styles.actionButton} ${styles.dangerButton}`}
                aria-label="DMLセクションを削除"
              >
                削除
              </button>
            </div>

            <textarea
              rows={4}
              className={styles.sqlTextarea}
              placeholder="INSERT INTO users (name) VALUES ('Taro'), ('Jiro');
SELECT * FROM users;"
              value={section.dmlInput}
              onChange={(e) => updateDmlInput(section.id, e.target.value)}
            />
            <button
              type="button"
              onClick={() => executeDML(section.id)}
              className={`${styles.actionButton} ${styles.primaryButton}`}
            >
              実行
            </button>

            {/* DML実行結果 */}
            <div className={styles.buttonGroup}>
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
          className={`${styles.actionButton} ${styles.secondaryButton}`}
        >
          ＋ DMLフォームを追加
        </button>
      </div>
    </div>
  )
}
