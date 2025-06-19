import { executeQuery } from '@liam-hq/pglite-server'
import type { SqlResult } from '@liam-hq/pglite-server/src/types'
import type { WorkflowState } from '../types'

const NODE_NAME = 'executeDDLNode'

/**
 * Execute DDL Node - Agent executes DDL
 * Performed by agent
 */
export async function executeDDLNode(
  state: WorkflowState,
): Promise<WorkflowState> {
  try {
    state.logger.log(`[${NODE_NAME}] Started`)

    if (!state.ddlStatements || !state.ddlStatements.trim()) {
      state.logger.log(`[${NODE_NAME}] No DDL statements to execute`)
      return {
        ...state,
        error: 'No DDL statements available for execution',
      }
    }

    const results: SqlResult[] = await executeQuery(
      state.designSessionId,
      state.ddlStatements,
    )

    const hasErrors = results.some((result: SqlResult) => !result.success)
    
    if (hasErrors) {
      const errorMessages = results
        .filter((result: SqlResult) => !result.success)
        .map((result: SqlResult) => `SQL: ${result.sql}, Error: ${JSON.stringify(result.result)}`)
        .join('; ')
      
      state.logger.log(`[${NODE_NAME}] DDL execution failed: ${errorMessages}`)
      
      return {
        ...state,
        error: `DDL execution failed: ${errorMessages}`,
      }
    }

    state.logger.log(`[${NODE_NAME}] DDL executed successfully`)
    state.logger.log(`[${NODE_NAME}] Completed`)

    return {
      ...state,
      error: undefined,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    state.logger.log(`[${NODE_NAME}] Failed: ${errorMessage}`)

    return {
      ...state,
      error: `DDL execution failed: ${errorMessage}`,
    }
  }
}
