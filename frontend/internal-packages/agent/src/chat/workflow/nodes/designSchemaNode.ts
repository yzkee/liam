import { HumanMessage } from '@langchain/core/messages'
import type { RunnableConfig } from '@langchain/core/runnables'
import type { Database } from '@liam-hq/db'
import { invokeDesignAgent } from '../../../langchain/agents/databaseSchemaBuildAgent/agent'
import { convertSchemaToText } from '../../../utils/convertSchemaToText'
import { getConfigurable } from '../shared/getConfigurable'
import type { WorkflowState } from '../types'
import { logAssistantMessage } from '../utils/timelineLogger'
import { withTimelineItemSync } from '../utils/withTimelineItemSync'

/**
 * Design Schema Node - DB Design & DDL Execution
 * Performed by dbAgent
 */
export async function designSchemaNode(
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

  await logAssistantMessage(
    state,
    repositories,
    'Designing your database structure to meet the identified requirements...',
    assistantRole,
  )

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
    await logAssistantMessage(state, repositories, errorMessage, assistantRole)
    return {
      ...state,
      error: new Error(errorMessage),
    }
  }

  const schemaText = convertSchemaToText(state.schemaData)

  // Log appropriate message for DDL retry case
  if (state.shouldRetryWithDesignSchema && state.ddlExecutionFailureReason) {
    await logAssistantMessage(
      state,
      repositories,
      'Redesigning schema to fix DDL execution errors...',
      assistantRole,
    )
  }

  // Use existing messages, or add DDL failure context if retrying
  let messages = [...state.messages]
  if (state.shouldRetryWithDesignSchema && state.ddlExecutionFailureReason) {
    const ddlRetryMessage = new HumanMessage(
      `The following DDL execution failed: ${state.ddlExecutionFailureReason}
Original request: ${state.userInput}
Please fix this issue by analyzing the schema and adding any missing constraints, primary keys, or other required schema elements to resolve the DDL execution error.`,
    )
    messages = [...messages, ddlRetryMessage]
  }

  const invokeResult = await invokeDesignAgent({ schemaText }, messages, {
    buildingSchemaVersionId: createVersionResult.versionId,
    repositories,
  })

  if (invokeResult.isErr()) {
    await logAssistantMessage(
      state,
      repositories,
      'Unable to complete the database design. There may be conflicts in the requirements...',
      assistantRole,
    )
    return {
      ...state,
      error: invokeResult.error,
    }
  }

  // Apply timeline sync to the message and clear retry flags
  const syncedMessage = await withTimelineItemSync(invokeResult.value, {
    designSessionId: state.designSessionId,
    organizationId: state.organizationId || '',
    userId: state.userId,
    repositories,
    assistantRole,
  })

  return {
    ...state,
    messages: [syncedMessage],
    buildingSchemaVersionId: createVersionResult.versionId,
    latestVersionNumber: state.latestVersionNumber + 1,
    shouldRetryWithDesignSchema: undefined,
    ddlExecutionFailureReason: undefined,
  }
}
