'use client'

import type { PGlite } from '@electric-sql/pglite'
import type { SqlResult } from './types'

/**
 * DDL実行関数（グローバルに影響）
 * テキストを分割して各SQL文を実行し、結果を返す
 */
export const applyDDL = async (
  ddlText: string,
  db: PGlite,
): Promise<SqlResult[]> => {
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
