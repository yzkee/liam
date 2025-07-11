import type { RunnableConfig } from '@langchain/core/runnables'
import { executeQuery } from '@liam-hq/pglite-server'
import type { SqlResult } from '@liam-hq/pglite-server/src/types'
import { getConfigurable } from '../shared/getConfigurable'
import type { WorkflowState } from '../types'

/**
 * Validate Schema Node - Combined DDL/DML Execution & Validation
 * Executes DDL (if needed) and then DML to validate schema with test data
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

  let updatedState = state

  // Execute DDL first if available and not already executed
  if (state.ddlStatements && !state.ddlExecutionFailed) {
    const ddlResults: SqlResult[] = await executeQuery(
      state.designSessionId,
      state.ddlStatements,
    )

    const ddlHasErrors = ddlResults.some((result: SqlResult) => !result.success)

    if (ddlHasErrors) {
      const errorMessages = ddlResults
        .filter((result: SqlResult) => !result.success)
        .map(
          (result: SqlResult) =>
            `SQL: ${result.sql}, Error: ${JSON.stringify(result.result)}`,
        )
        .join('; ')

      // Continue to try DML even if DDL fails
      updatedState = {
        ...updatedState,
        ddlExecutionFailed: true,
        ddlExecutionFailureReason: errorMessages,
      }
    }
  }

  // Check if DML statements are available
  if (!updatedState.dmlStatements || !updatedState.dmlStatements.trim()) {
    return updatedState
  }
  // Execute DML statements
  const results: SqlResult[] = await executeQuery(
    updatedState.designSessionId,
    updatedState.dmlStatements,
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
      ...updatedState,
      dmlExecutionErrors: errorMessages,
    }
  }

  return {
    ...updatedState,
    dmlExecutionSuccessful: true,
  }
}
