import { postgresqlSchemaDeparser } from '@liam-hq/db-structure'
import { executeQuery } from '@liam-hq/pglite-server'
import type { SqlResult } from '@liam-hq/pglite-server/src/types'
import { Result } from 'neverthrow'
import type { AgentError } from '../../../types/errors'
import { getWorkflowNodeProgress } from '../shared/getWorkflowNodeProgress'
import type { WorkflowState } from '../types'

const NODE_NAME = 'executeDdlNode'

/**
 * Execute DDL Node - Generates DDL from schema and executes it
 * Generates DDL mechanically without LLM and then executes
 */
export async function executeDdlNode(
  state: WorkflowState,
): Promise<WorkflowState> {
  state.logger.log(`[${NODE_NAME}] Started`)

  // Update progress message if available
  if (state.progressTimelineItemId) {
    await state.repositories.schema.updateTimelineItem(
      state.progressTimelineItemId,
      {
        content: 'Processing: executeDDL',
        progress: getWorkflowNodeProgress('executeDDL'),
      },
    )
  }

  // Generate DDL from schema data
  const generateDdl = Result.fromThrowable(
    () => {
      const result = postgresqlSchemaDeparser(state.schemaData)
      return result.value
    },
    (error): AgentError => ({
      type: 'DDL_GENERATION_ERROR',
      message: error instanceof Error ? error.message : 'DDL generation failed',
      cause: error,
    }),
  )

  const ddlResult = generateDdl()

  if (ddlResult.isErr()) {
    state.logger.log(
      `[${NODE_NAME}] DDL generation failed: ${ddlResult.error.message}`,
    )
    state.logger.log(`[${NODE_NAME}] Completed`)
    return {
      ...state,
      ddlStatements: 'DDL generation failed due to an unexpected error.',
    }
  }

  const ddlStatements = ddlResult.value

  // Log detailed information about what was generated
  const tableCount = Object.keys(state.schemaData.tables).length
  const ddlLength = ddlStatements.length

  state.logger.log(
    `[${NODE_NAME}] Generated DDL for ${tableCount} tables (${ddlLength} characters)`,
  )
  state.logger.debug(`[${NODE_NAME}] Generated DDL:`, { ddlStatements })

  if (!ddlStatements || !ddlStatements.trim()) {
    state.logger.log(`[${NODE_NAME}] No DDL statements to execute`)
    state.logger.log(`[${NODE_NAME}] Completed`)
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

    state.logger.log(`[${NODE_NAME}] DDL execution failed: ${errorMessages}`)
    state.logger.log(`[${NODE_NAME}] Completed`)
    return {
      ...state,
    }
  }

  state.logger.log(`[${NODE_NAME}] DDL executed successfully`)
  state.logger.log(`[${NODE_NAME}] Completed`)

  return {
    ...state,
    ddlStatements,
  }
}
