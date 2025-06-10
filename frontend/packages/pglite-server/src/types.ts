import type { PGlite } from '@electric-sql/pglite'

export interface SqlResult {
  sql: string
  result: unknown
  success: boolean
  id: string
  metadata: {
    executionTime: number
    timestamp: string
    affectedRows?: number
  }
}

export interface PGliteInstance {
  db: PGlite
  lastAccessed: Date
}

export type QueryType = 'DDL' | 'DML'
