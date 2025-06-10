import { PGlite } from '@electric-sql/pglite'
import type { PGliteInstance, SqlResult } from './types'

/**
 * Manages PGlite database instances with automatic cleanup of inactive sessions
 */
export class PGliteInstanceManager {
  private instances = new Map<string, PGliteInstance>()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Setup automatic cleanup of inactive instances every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupInactiveInstances()
      },
      5 * 60 * 1000,
    )
  }

  /**
   * Retrieves existing PGlite instance or creates a new one for the session
   */
  async getOrCreateInstance(sessionId: string): Promise<PGlite> {
    const existing = this.instances.get(sessionId)
    if (existing) {
      existing.lastAccessed = new Date()
      return existing.db
    }

    // Create new PGlite instance for this session
    const db = new PGlite()
    this.instances.set(sessionId, {
      db,
      lastAccessed: new Date(),
    })
    return db
  }

  /**
   * Cleanup instances that haven't been accessed for 30 minutes
   */
  private cleanupInactiveInstances() {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
    for (const [sessionId, instance] of Array.from(this.instances.entries())) {
      if (instance.lastAccessed < thirtyMinutesAgo) {
        instance.db.close?.()
        this.instances.delete(sessionId)
      }
    }
  }

  /**
   * Execute SQL query for a specific session
   */
  async executeQuery(sessionId: string, sql: string): Promise<SqlResult[]> {
    const db = await this.getOrCreateInstance(sessionId)
    return this.executeSql(sql, db)
  }

  /**
   * Execute SQL statements and return results with metadata
   * Handles multiple statements separated by semicolons
   */
  private async executeSql(sqlText: string, db: PGlite): Promise<SqlResult[]> {
    const results: SqlResult[] = []

    // Split SQL text into individual statements
    const statements = sqlText
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)

    // Execute each statement and collect results
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
   * Cleanup all instances and stop the cleanup interval
   * Should be called when shutting down the application
   */
  destroy() {
    clearInterval(this.cleanupInterval)
    for (const [, instance] of Array.from(this.instances.entries())) {
      instance.db.close?.()
    }
    this.instances.clear()
  }
}
