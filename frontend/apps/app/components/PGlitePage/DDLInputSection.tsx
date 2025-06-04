'use client'

import styles from './PGlitePage.module.css'
import { QueryResultBox } from './QueryResultBox'
import type { DDLState } from './utils/types'

interface DDLInputSectionProps {
  ddlState: DDLState
  updateDdlInput: (value: string) => void
  executeDDL: () => Promise<void>
}

export function DDLInputSection({
  ddlState,
  updateDdlInput,
  executeDDL,
}: DDLInputSectionProps) {
  return (
    <div className={styles.playgroundSection}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>DDL入力エリア（グローバル）</h2>
      </div>
      <p className={styles.description}>
        DDLを入力して実行すると、すべてのDMLフォームに反映されます。
        複数のSQL文を一度に実行できます。各SQL文は
        <code className={styles.codeHighlight}>;</code>
        （セミコロン）で区切ってください。
      </p>
      <textarea
        rows={5}
        className={styles.sqlTextarea}
        placeholder="CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT);
CREATE TABLE posts (id SERIAL PRIMARY KEY, title TEXT, user_id INTEGER REFERENCES users(id));"
        value={ddlState.ddlInput}
        onChange={(e) => updateDdlInput(e.target.value)}
      />
      <button
        type="button"
        onClick={executeDDL}
        className={`${styles.actionButton} ${styles.primaryButton}`}
      >
        DDLを実行
      </button>

      {/* DDL実行結果 */}
      <div className={styles.buttonGroup}>
        {ddlState.results.map((result) => (
          <QueryResultBox key={result.id} result={result} />
        ))}
      </div>
    </div>
  )
}
