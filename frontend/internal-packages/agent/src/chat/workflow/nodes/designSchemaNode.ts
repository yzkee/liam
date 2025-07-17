import { HumanMessage } from '@langchain/core/messages'
import type { RunnableConfig } from '@langchain/core/runnables'
import {
  type DesignResponse,
  type InvokeResult,
  invokeDesignAgent,
} from '../../../langchain/agents/databaseSchemaBuildAgent/agent'
import type { Repositories } from '../../../repositories'
import { convertSchemaToText } from '../../../utils/convertSchemaToText'
import { getConfigurable } from '../shared/getConfigurable'
import type { WorkflowState } from '../types'
import { prepareDesignSchemaUserMessage } from '../utils/messageFormatters'
import { logAssistantMessage } from '../utils/timelineLogger'

/**
 * Apply schema changes and return updated state
 */
const applySchemaChanges = async (
  operations: DesignResponse['operations'],
  buildingSchemaVersionId: string,
  message: string,
  state: WorkflowState,
  repositories: Repositories,
): Promise<WorkflowState> => {
  await logAssistantMessage(state, repositories, 'Applying schema changes...')

  const result = await repositories.schema.updateVersion({
    buildingSchemaVersionId,
    patch: operations,
  })

  if (!result.success) {
    const errorMessage = result.error || 'Failed to update schema'
    await logAssistantMessage(state, repositories, 'Schema update failed')
    return {
      ...state,
      generatedAnswer: message,
      error: new Error(errorMessage),
    }
  }

  await logAssistantMessage(
    state,
    repositories,
    `Applied ${operations.length} schema changes successfully`,
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
  invokeResult: InvokeResult,
  buildingSchemaVersionId: string,
  state: WorkflowState,
  repositories: Repositories,
): Promise<WorkflowState> => {
  if (invokeResult.operations.length === 0) {
    return {
      ...state,
      generatedAnswer: invokeResult.message.text,
    }
  }

  return await applySchemaChanges(
    invokeResult.operations,
    buildingSchemaVersionId,
    invokeResult.message.text,
    state,
    repositories,
  )
}

/**
 * Design Schema Node - DB Design & DDL Execution
 * Performed by dbAgent
 */
export async function designSchemaNode(
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
  const { repositories } = configurableResult.value

  await logAssistantMessage(state, repositories, 'Designing database schema...')

  // Create empty version at the beginning of the node
  const buildingSchemaId = state.buildingSchemaId
  const latestVersionNumber = state.latestVersionNumber

  const createVersionResult = await repositories.schema.createEmptyPatchVersion(
    {
      buildingSchemaId,
      latestVersionNumber,
    },
  )

  if (!createVersionResult.success) {
    const errorMessage =
      createVersionResult.error || 'Failed to create new version'
    await logAssistantMessage(state, repositories, 'Version creation failed')
    return {
      ...state,
      error: new Error(errorMessage),
    }
  }

  const buildingSchemaVersionId = createVersionResult.versionId

  await logAssistantMessage(
    state,
    repositories,
    'Created new schema version for updates...',
  )

  const schemaText = convertSchemaToText(state.schemaData)

  // Prepare user message with context
  const userMessage = prepareDesignSchemaUserMessage(state)

  // Log appropriate message for DDL retry case
  if (state.shouldRetryWithDesignSchema && state.ddlExecutionFailureReason) {
    await logAssistantMessage(
      state,
      repositories,
      'Redesigning schema to fix DDL execution errors...',
    )
  }

  // Convert messages to BaseMessage array and add user message
  const messages = [...state.messages, new HumanMessage(userMessage)]

  await logAssistantMessage(
    state,
    repositories,
    'Analyzing table structure and relationships...',
  )

  const invokeResult = await invokeDesignAgent({ schemaText }, messages)

  if (invokeResult.isErr()) {
    await logAssistantMessage(state, repositories, 'Schema design failed')
    return {
      ...state,
      error: invokeResult.error,
    }
  }

  const result = await handleSchemaChanges(
    invokeResult.value,
    buildingSchemaVersionId,
    state,
    repositories,
  )

  await logAssistantMessage(state, repositories, 'Schema design completed')

  // Clear retry flags after processing
  const finalResult = {
    ...result,
    messages: [
      ...state.messages,
      new HumanMessage(userMessage),
      invokeResult.value.message,
    ],
    shouldRetryWithDesignSchema: undefined,
    ddlExecutionFailureReason: undefined,
  }

  return finalResult
}
