import { PGliteInstanceManager } from './PGliteInstanceManager'
import type { SqlResult } from './types'

const manager = new PGliteInstanceManager()

export async function executeQuery(
  sessionId: string,
  sql: string,
  type: 'DDL' | 'DML',
): Promise<SqlResult[]> {
  return await manager.executeQuery(sessionId, sql, type)
}

export const query = executeQuery

export { manager as pgliteManager }
