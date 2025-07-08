import type { RunnableConfig } from '@langchain/core/runnables'
import { DatabaseSchemaBuildAgent } from '../../../langchain/agents'
import type { BuildAgentResponse } from '../../../langchain/agents/databaseSchemaBuildAgent/agent'
import type { SchemaAwareChatVariables } from '../../../langchain/utils/types'
import type { Repositories } from '../../../repositories'
import { convertSchemaToText } from '../../../utils/convertSchemaToText'
import type { NodeLogger } from '../../../utils/nodeLogger'
import { getWorkflowNodeProgress } from '../shared/getWorkflowNodeProgress'
import type { WorkflowState } from '../types'

const NODE_NAME = 'designSchemaNode'

interface PreparedSchemaDesign {
  agent: DatabaseSchemaBuildAgent
  schemaText: string
}

/**
 * Apply schema changes and return updated state
 */
const applySchemaChanges = async (
  schemaChanges: BuildAgentResponse['schemaChanges'],
  buildingSchemaId: string,
  latestVersionNumber: number,
  message: string,
  state: WorkflowState,
  repositories: Repositories,
  logger: NodeLogger,
): Promise<WorkflowState> => {
  const result = await repositories.schema.createVersion({
    buildingSchemaId,
    latestVersionNumber,
    patch: schemaChanges,
  })

  if (!result.success) {
    const errorMessage = result.error || 'Failed to update schema'
    logger.error('Schema update failed:', {
      error: errorMessage,
    })
    return {
      ...state,
      generatedAnswer: message,
      error: errorMessage,
    }
  }

  const newTableCount = Object.keys(result.newSchema.tables).length
  logger.log(
    `[${NODE_NAME}] Applied ${schemaChanges.length} schema changes successfully (${newTableCount} tables)`,
  )

  return {
    ...state,
    schemaData: result.newSchema,
    generatedAnswer: message,
    error: undefined,
  }
}

/**
 * Handle schema changes if they exist
 */
const handleSchemaChanges = async (
  parsedResponse: BuildAgentResponse,
  state: WorkflowState,
  repositories: Repositories,
  logger: NodeLogger,
): Promise<WorkflowState> => {
  if (parsedResponse.schemaChanges.length === 0) {
    return {
      ...state,
      generatedAnswer: parsedResponse.message,
    }
  }

  const buildingSchemaId = state.buildingSchemaId
  const latestVersionNumber = state.latestVersionNumber

  return await applySchemaChanges(
    parsedResponse.schemaChanges,
    buildingSchemaId,
    latestVersionNumber,
    parsedResponse.message,
    state,
    repositories,
    logger,
  )
}

async function prepareSchemaDesign(
  state: WorkflowState,
  logger: NodeLogger,
): Promise<PreparedSchemaDesign> {
  const schemaText = convertSchemaToText(state.schemaData)

  // Log current schema state for debugging
  const tableCount = Object.keys(state.schemaData.tables).length
  logger.log(`[${NODE_NAME}] Current schema has ${tableCount} tables`)

  // Create the agent instance
  const agent = new DatabaseSchemaBuildAgent()

  return {
    agent,
    schemaText,
  }
}

/**
 * Design Schema Node - DB Design & DDL Execution
 * Performed by dbAgent
 */
export async function designSchemaNode(
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
      content: 'Processing: designSchema',
      progress: getWorkflowNodeProgress('designSchema'),
    })
  }

  const { agent, schemaText } = await prepareSchemaDesign(state, logger)

  // Check if this is a retry after DDL execution failure
  let userMessage = state.userInput
  if (state.shouldRetryWithDesignSchema && state.ddlExecutionFailureReason) {
    userMessage = `The following DDL execution failed: ${state.ddlExecutionFailureReason}

Original request: ${state.userInput}

Please fix this issue by analyzing the schema and adding any missing constraints, primary keys, or other required schema elements to resolve the DDL execution error.`

    state.logger.log(`[${NODE_NAME}] Retrying after DDL execution failure`)
  }

  // Create prompt variables directly
  const promptVariables: SchemaAwareChatVariables = {
    schema_text: schemaText,
    chat_history: state.formattedHistory,
    user_message: userMessage,
  }

  // Use agent's generate method with prompt variables
  const response = await agent.generate(promptVariables)
  const result = await handleSchemaChanges(
    response,
    state,
    repositories,
    logger,
  )

  // Clear retry flags after processing
  const finalResult = {
    ...result,
    shouldRetryWithDesignSchema: undefined,
    ddlExecutionFailureReason: undefined,
  }

  logger.log(`[${NODE_NAME}] Completed`)
  return finalResult
}
