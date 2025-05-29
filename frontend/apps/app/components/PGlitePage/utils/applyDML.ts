'use client'

import type { PGlite } from '@electric-sql/pglite'
import type { SqlResult } from './types'

/**
 * DML実行関数（各ユースケース用）
 * テキストを分割して各SQL文を実行し、結果を返す
 */
export const applyDML = async (
  dmlText: string,
  db: PGlite,
): Promise<SqlResult[]> => {
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
