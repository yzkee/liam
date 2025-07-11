import type { RunnableConfig } from '@langchain/core/runnables'
import { executeQuery } from '@liam-hq/pglite-server'
import type { SqlResult } from '@liam-hq/pglite-server/src/types'
import { getConfigurable } from '../shared/getConfigurable'
import type { WorkflowState } from '../types'

const NODE_NAME = 'validateSchemaNode'

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
  const { logger } = configurableResult.value

  logger.log(`[${NODE_NAME}] Started`)

  // Check if DML statements are available
  if (!state.dmlStatements || !state.dmlStatements.trim()) {
    state.logger.log(`[${NODE_NAME}] No DML statements to execute`)
    state.logger.log(`[${NODE_NAME}] Completed`)
    return state
  }

  // Log DML execution intent
  const dmlLength = state.dmlStatements.length
  const statementCount = (state.dmlStatements.match(/;/g) || []).length + 1
  state.logger.log(
    `[${NODE_NAME}] Executing ${statementCount} DML statements (${dmlLength} characters)`,
  )
  state.logger.debug(`[${NODE_NAME}] DML statements:`, {
    dmlStatements: state.dmlStatements,
  })

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

    state.logger.error(`[${NODE_NAME}] DML execution failed: ${errorMessages}`)
    state.logger.log(`[${NODE_NAME}] Completed with errors`)

    // For now, we continue even with errors (future PR will handle error recovery)
    return {
      ...state,
      dmlExecutionErrors: errorMessages,
    }
  }

  // Log successful execution
  const successfulCount = results.filter((r) => r.success).length
  state.logger.log(
    `[${NODE_NAME}] DML executed successfully: ${successfulCount} statements`,
  )

  // Log affected rows if available
  const totalAffectedRows = results.reduce((total, result) => {
    if (result.success && result.metadata?.affectedRows) {
      return total + result.metadata.affectedRows
    }
    return total
  }, 0)

  if (totalAffectedRows > 0) {
    state.logger.info(
      `[${NODE_NAME}] Total rows affected: ${totalAffectedRows}`,
    )
  }

  logger.log(`[${NODE_NAME}] Completed`)

  return {
    ...state,
    dmlExecutionSuccessful: true,
  }
}
