import type { RunnableConfig } from '@langchain/core/runnables'
import { postgresqlSchemaDeparser } from '@liam-hq/db-structure'
import { executeQuery } from '@liam-hq/pglite-server'
import type { SqlResult } from '@liam-hq/pglite-server/src/types'
import type { Repositories } from '../../../repositories'
import type { NodeLogger } from '../../../utils/nodeLogger'
import { WORKFLOW_RETRY_CONFIG } from '../constants'
import { getWorkflowNodeProgress } from '../shared/getWorkflowNodeProgress'
import type { WorkflowState } from '../types'

const NODE_NAME = 'executeDdlNode'

/**
 * Execute DDL Node - Generates DDL from schema and executes it
 * Generates DDL mechanically without LLM and then executes
 */
export async function executeDdlNode(
  state: WorkflowState,
  config: RunnableConfig,
): Promise<WorkflowState> {
  const { repositories, logger } = config.configurable as {
    repositories: Repositories
    logger: NodeLogger
  }

  logger.log(`[${NODE_NAME}] Started`)

  // Update progress message if available
  if (state.progressTimelineItemId) {
    await repositories.schema.updateTimelineItem(state.progressTimelineItemId, {
      content: 'Processing: executeDDL',
      progress: getWorkflowNodeProgress('executeDDL'),
    })
  }

  // Generate DDL from schema data
  let ddlStatements: string
  try {
    const result = postgresqlSchemaDeparser(state.schemaData)

    if (result.errors.length > 0) {
      const errorMessages = result.errors.map((e) => e.message).join('; ')
      logger.log(`[${NODE_NAME}] DDL generation failed: ${errorMessages}`)
      logger.log(`[${NODE_NAME}] Completed`)
      return {
        ...state,
        ddlStatements: 'DDL generation failed due to an unexpected error.',
      }
    }

    ddlStatements = result.value

    // Log detailed information about what was generated
    const tableCount = Object.keys(state.schemaData.tables).length
    const ddlLength = ddlStatements.length

    logger.log(
      `[${NODE_NAME}] Generated DDL for ${tableCount} tables (${ddlLength} characters)`,
    )
    logger.debug(`[${NODE_NAME}] Generated DDL:`, { ddlStatements })
  } catch (error) {
    logger.log(`[${NODE_NAME}] DDL generation failed: ${error}`)
    logger.log(`[${NODE_NAME}] Completed`)
    return {
      ...state,
      ddlStatements: 'DDL generation failed due to an unexpected error.',
    }
  }

  if (!ddlStatements || !ddlStatements.trim()) {
    logger.log(`[${NODE_NAME}] No DDL statements to execute`)
    logger.log(`[${NODE_NAME}] Completed`)
    return {
      ...state,
      ddlStatements,
    }
  }

  const results: SqlResult[] = await executeQuery(
    state.designSessionId,
    ddlStatements,
  )

  const hasErrors = results.some((result: SqlResult) => !result.success)

  if (hasErrors) {
    const errorMessages = results
      .filter((result: SqlResult) => !result.success)
      .map(
        (result: SqlResult) =>
          `SQL: ${result.sql}, Error: ${JSON.stringify(result.result)}`,
      )
      .join('; ')

    logger.log(`[${NODE_NAME}] DDL execution failed: ${errorMessages}`)

    // Check if this is the first failure or if we've already retried
    const currentRetryCount = state.retryCount['ddlExecutionRetry'] || 0

    if (currentRetryCount < WORKFLOW_RETRY_CONFIG.MAX_DDL_EXECUTION_RETRIES) {
      // Set up retry with designSchemaNode
      logger.log(`[${NODE_NAME}] Scheduling retry via designSchemaNode`)
      logger.log(`[${NODE_NAME}] Completed`)
      return {
        ...state,
        shouldRetryWithDesignSchema: true,
        ddlExecutionFailureReason: errorMessages,
        retryCount: {
          ...state.retryCount,
          ddlExecutionRetry: currentRetryCount + 1,
        },
      }
    }

    // Already retried - mark as permanently failed
    logger.log(
      `[${NODE_NAME}] DDL execution failed after retry, marking as failed`,
    )
    logger.log(`[${NODE_NAME}] Completed`)
    return {
      ...state,
      ddlExecutionFailed: true,
      ddlExecutionFailureReason: errorMessages,
    }
  }

  logger.log(`[${NODE_NAME}] DDL executed successfully`)
  logger.log(`[${NODE_NAME}] Completed`)

  return {
    ...state,
    ddlStatements,
  }
}
