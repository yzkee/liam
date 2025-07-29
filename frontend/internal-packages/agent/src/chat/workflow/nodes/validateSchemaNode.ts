import type { RunnableConfig } from '@langchain/core/runnables'
import type { Database } from '@liam-hq/db'
import { executeQuery } from '@liam-hq/pglite-server'
import type { SqlResult } from '@liam-hq/pglite-server/src/types'
import type { Usecase } from '../../../langchain/agents/qaGenerateUsecaseAgent/agent'
import { getConfigurable } from '../shared/getConfigurable'
import type { WorkflowState } from '../types'
import { logAssistantMessage } from '../utils/timelineLogger'
import {
  createOrUpdateArtifact,
  transformWorkflowStateToArtifact,
} from '../utils/transformWorkflowStateToArtifact'

type DmlOperationResult = {
  useCaseId: string
  operationIndex: number
  sql: string
  success: boolean
  result?: unknown
  error?: string | undefined
  executedAt: Date
}

/**
 * Execute DML operations individually to track results per use case
 */
async function executeDmlOperationsIndividually(
  sessionId: string,
  usecases: Usecase[],
): Promise<DmlOperationResult[]> {
  const results: DmlOperationResult[] = []

  for (const usecase of usecases) {
    for (let i = 0; i < usecase.dmlOperations.length; i++) {
      const dmlOp = usecase.dmlOperations[i]
      if (!dmlOp) continue

      const sqlResults: SqlResult[] = await executeQuery(sessionId, dmlOp.sql)
      const sqlResult = sqlResults[0]

      if (sqlResult) {
        results.push({
          useCaseId: usecase.id,
          operationIndex: i,
          sql: dmlOp.sql,
          success: sqlResult.success,
          result: sqlResult.result,
          error: sqlResult.success
            ? undefined
            : JSON.stringify(sqlResult.result),
          executedAt: new Date(),
        })
      } else {
        results.push({
          useCaseId: usecase.id,
          operationIndex: i,
          sql: dmlOp.sql,
          success: false,
          error: 'No SQL result returned',
          executedAt: new Date(),
        })
      }
    }
  }

  return results
}

/**
 * Update workflow state with DML execution results
 */
function updateWorkflowStateWithResults(
  state: WorkflowState,
  results: DmlOperationResult[],
): WorkflowState {
  if (!state.generatedUsecases || !state.dmlOperations) {
    return state
  }

  const updatedDmlOperations = state.dmlOperations.map((dmlOp) => {
    const matchingResults = results.filter((r) => r.sql === dmlOp.sql)

    const executionLogs = matchingResults.map((result) => ({
      executed_at: result.executedAt.toISOString(),
      success: result.success,
      result_summary: result.success
        ? 'Operation completed successfully'
        : `Error: ${result.error}`,
    }))

    return {
      ...dmlOp,
      dml_execution_logs: executionLogs,
    }
  })

  return {
    ...state,
    dmlOperations: updatedDmlOperations,
  }
}

/**
 * Validate Schema Node - Individual DML Execution & Result Mapping
 * Executes DDL first, then DML operations individually to associate results with use cases
 */
export async function validateSchemaNode(
  state: WorkflowState,
  config: RunnableConfig,
): Promise<WorkflowState> {
  const assistantRole: Database['public']['Enums']['assistant_role_enum'] = 'db'
  const configurableResult = getConfigurable(config)
  if (configurableResult.isErr()) {
    return {
      ...state,
      error: configurableResult.error,
    }
  }
  const { repositories } = configurableResult.value

  // Check if we have any statements to execute
  const hasDdl = state.ddlStatements?.trim()
  const hasDml = state.dmlOperations && state.dmlOperations.length > 0
  const hasUsecases =
    state.generatedUsecases && state.generatedUsecases.length > 0

  if (!hasDdl && !hasDml) {
    return state
  }

  let allResults: SqlResult[] = []

  const combinedStatements = [
    hasDdl ? state.ddlStatements : '',
    hasDml ? 'DML operations executed individually' : '',
  ]
    .filter(Boolean)
    .join('\n')

  // Execute DDL first if present
  if (hasDdl && state.ddlStatements) {
    const ddlResults: SqlResult[] = await executeQuery(
      state.designSessionId,
      state.ddlStatements,
    )
    allResults = [...ddlResults]
  }

  // Execute DML operations individually if present
  let dmlOperationResults: DmlOperationResult[] = []
  let updatedState = state
  if (hasDml && hasUsecases && state.generatedUsecases) {
    dmlOperationResults = await executeDmlOperationsIndividually(
      state.designSessionId,
      state.generatedUsecases,
    )

    const dmlSqlResults: SqlResult[] = dmlOperationResults.map((result) => ({
      sql: result.sql,
      result: result.result,
      success: result.success,
      id: `dml-${result.useCaseId}-${result.operationIndex}`,
      metadata: {
        executionTime: 0,
        timestamp: result.executedAt.toISOString(),
      },
    }))
    allResults = [...allResults, ...dmlSqlResults]

    // Update workflow state with execution results
    updatedState = updateWorkflowStateWithResults(state, dmlOperationResults)

    // Update artifact with the new state
    const artifact = transformWorkflowStateToArtifact(updatedState)
    await createOrUpdateArtifact(updatedState, artifact, repositories)
  }

  const results = allResults

  const queryResult = await repositories.schema.createValidationQuery({
    designSessionId: state.designSessionId,
    queryString: combinedStatements,
  })

  if (queryResult.success) {
    await repositories.schema.createValidationResults({
      validationQueryId: queryResult.queryId,
      results,
    })

    const successCount = results.filter((r) => r.success).length
    const errorCount = results.length - successCount
    const validationMessage =
      errorCount === 0
        ? 'Database validation complete: all checks passed successfully'
        : `Database validation found ${errorCount} issues that need attention`

    await logAssistantMessage(
      state,
      repositories,
      validationMessage,
      assistantRole,
    )
  }

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
