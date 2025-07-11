import type { RunnableConfig } from '@langchain/core/runnables'
import { executeQuery } from '@liam-hq/pglite-server'
import type { SqlResult } from '@liam-hq/pglite-server/src/types'
import { getConfigurable } from '../shared/getConfigurable'
import type { WorkflowState } from '../types'

/**
 * Validate Schema Node - DML Execution & Validation
 * Executed after DDL to populate schema with test data
 */
export async function validateSchemaNode(
  state: WorkflowState,
  config: RunnableConfig,
): Promise<WorkflowState> {
  const configurableResult = getConfigurable(config)
  if (configurableResult.isErr()) {
    return {
      ...state,
      error: configurableResult.error,
    }
  }

  // Check if DML statements are available
  if (!state.dmlStatements || !state.dmlStatements.trim()) {
    return state
  }

  // Execute DML statements
  const results: SqlResult[] = await executeQuery(
    state.designSessionId,
    state.dmlStatements,
  )

  // Check for execution errors
  const hasErrors = results.some((result: SqlResult) => !result.success)

  if (hasErrors) {
    const errorMessages = results
      .filter((result: SqlResult) => !result.success)
      .map(
        (result: SqlResult) =>
          `SQL: ${result.sql}, Error: ${JSON.stringify(result.result)}`,
      )
      .join('; ')

    // For now, we continue even with errors (future PR will handle error recovery)
    return {
      ...state,
      dmlExecutionErrors: errorMessages,
    }
  }

  return {
    ...state,
    dmlExecutionSuccessful: true,
  }
}
