import type { BaseMessage } from '@langchain/core/messages'
import type { WorkflowState } from '../../chat/workflow/types'
import { extractToolCallIds } from '../../utils/messageHelpers'

/**
 * Determines the next node based on whether the last message contains tool calls
 */
export const routeAfterDesignSchema = (
  state: WorkflowState,
): 'invokeSchemaDesignTool' | 'generateUsecase' => {
  const { messages } = state
  const lastMessage = messages[messages.length - 1]

  // Debug: Log routing decision
  if (process.env['NODE_ENV'] !== 'production') {
    // biome-ignore lint/suspicious/noConsole: Debug logging
    console.log('[DEBUG] routeAfterDesignSchema - Routing decision:', {
      messageCount: messages.length,
      lastMessageType: lastMessage?._getType(),
      hasToolCalls: lastMessage && hasToolCalls(lastMessage),
      toolCallIds:
        lastMessage && 'tool_calls' in lastMessage
          ? extractToolCallIds(lastMessage.tool_calls)
          : [],
      decision:
        lastMessage && hasToolCalls(lastMessage)
          ? 'invokeSchemaDesignTool'
          : 'generateUsecase',
    })
  }

  if (lastMessage && hasToolCalls(lastMessage)) {
    return 'invokeSchemaDesignTool'
  }

  return 'generateUsecase'
}

/**
 * Checks if a message contains tool calls
 */
const hasToolCalls = (message: BaseMessage): boolean => {
  return (
    'tool_calls' in message &&
    Array.isArray(message.tool_calls) &&
    message.tool_calls.length > 0
  )
}
