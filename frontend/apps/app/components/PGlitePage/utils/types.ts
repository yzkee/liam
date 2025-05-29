'use client'

import type { PGlite } from '@electric-sql/pglite'

// 結果の型定義
export interface SqlResult {
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
export interface DDLState {
  ddlInput: string
  results: SqlResult[]
}

// DMLセクション用の状態（各セクションが独立）
export interface DMLSection {
  id: string
  dmlInput: string
  results: SqlResult[]
  db: PGlite | null // 各DMLセクションは独自のPGliteインスタンスを持つ
}
