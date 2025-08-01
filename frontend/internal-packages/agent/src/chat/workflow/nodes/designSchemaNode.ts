import { AIMessage, HumanMessage } from '@langchain/core/messages'
import type { RunnableConfig } from '@langchain/core/runnables'
import type { Database } from '@liam-hq/db'
import { invokeDesignAgent } from '../../../langchain/agents/databaseSchemaBuildAgent/agent'
import { convertSchemaToText } from '../../../utils/convertSchemaToText'
import { extractToolCallIds } from '../../../utils/messageHelpers'
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

  // Debug: Log incoming state
  if (process.env['NODE_ENV'] !== 'production') {
    // biome-ignore lint/suspicious/noConsole: Debug logging
    console.log('[DEBUG] designSchemaNode - Incoming state:', {
      messageCount: state.messages.length,
      messageTypes: state.messages.map((m) => m._getType()),
      lastMessage: state.messages[state.messages.length - 1],
      toolCallsInMessages: state.messages.map((m, idx) => ({
        index: idx,
        type: m._getType(),
        hasToolCalls:
          'tool_calls' in m &&
          Array.isArray(m.tool_calls) &&
          m.tool_calls.length > 0,
        toolCallIds: 'tool_calls' in m ? extractToolCallIds(m.tool_calls) : [],
      })),
    })
  }

  const configurableResult = getConfigurable(config)
  if (configurableResult.isErr()) {
    return {
      ...state,
      error: configurableResult.error,
    }
  }
  const { repositories } = configurableResult.value

  const schemaText = convertSchemaToText(state.schemaData)

  // Remove reasoning field from AIMessages to avoid API issues
  // This prevents the "reasoning without required following item" error
  const messages = state.messages.map((msg, idx) => {
    if (msg instanceof AIMessage) {
      // Create a new AIMessage without the reasoning field
      // Clone the message but exclude reasoning if it exists
      const {
        content,
        additional_kwargs,
        response_metadata,
        tool_calls,
        invalid_tool_calls,
        usage_metadata,
      } = msg
      const cleanedKwargs = { ...additional_kwargs }

      // Remove reasoning from additional_kwargs if it exists
      if ('reasoning' in cleanedKwargs) {
        delete cleanedKwargs['reasoning']
      }

      // Debug: Log tool_calls preservation
      if (
        process.env['NODE_ENV'] !== 'production' &&
        tool_calls &&
        tool_calls.length > 0
      ) {
        // biome-ignore lint/suspicious/noConsole: Debug logging
        console.log(
          `[DEBUG] designSchemaNode - Preserving tool_calls for message ${idx}:`,
          {
            originalToolCalls: tool_calls,
            toolCallIds: tool_calls.map((tc) => tc.id),
          },
        )
      }

      // Preserve all other message properties including tool_calls
      const aiMessageFields: {
        content: typeof content
        additional_kwargs: typeof cleanedKwargs
        response_metadata: typeof response_metadata
        tool_calls?: typeof tool_calls
        invalid_tool_calls?: typeof invalid_tool_calls
        usage_metadata?: typeof usage_metadata
      } = {
        content,
        additional_kwargs: cleanedKwargs,
        response_metadata,
      }

      // Only add optional fields if they are defined
      if (tool_calls !== undefined) {
        aiMessageFields.tool_calls = tool_calls
      }
      if (invalid_tool_calls !== undefined) {
        aiMessageFields.invalid_tool_calls = invalid_tool_calls
      }
      if (usage_metadata !== undefined) {
        aiMessageFields.usage_metadata = usage_metadata
      }

      return new AIMessage(aiMessageFields)
    }
    return msg
  })

  const invokeResult = await invokeDesignAgent({ schemaText }, messages, {
    buildingSchemaId: state.buildingSchemaId,
    latestVersionNumber: state.latestVersionNumber,
    designSessionId: state.designSessionId,
    repositories,
  })

  if (invokeResult.isErr()) {
    // Create a human message for error feedback to avoid reasoning API issues
    // Using HumanMessage prevents the "reasoning without required following item" error
    const errorFeedbackMessage = new HumanMessage({
      content: `The previous attempt failed with the following error: ${invokeResult.error.message}. Please try a different approach to resolve the issue.`,
    })

    // Return state with error feedback as HumanMessage for self-recovery
    return {
      ...state,
      messages: [...messages, errorFeedbackMessage],
      error: invokeResult.error,
    }
  }

  const { response, reasoning } = invokeResult.value

  // Log reasoning summary if available
  if (reasoning?.summary && reasoning.summary.length > 0) {
    for (const summaryItem of reasoning.summary) {
      await logAssistantMessage(
        state,
        repositories,
        summaryItem.text,
        assistantRole,
      )
    }
  }

  // Apply timeline sync to the message and clear retry flags
  const syncedMessage = await withTimelineItemSync(response, {
    designSessionId: state.designSessionId,
    organizationId: state.organizationId || '',
    userId: state.userId,
    repositories,
    assistantRole,
  })

  return {
    ...state,
    messages: [...messages, syncedMessage],
    latestVersionNumber: state.latestVersionNumber + 1,
  }
}
