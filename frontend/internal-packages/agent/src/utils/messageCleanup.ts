import { AIMessage, type BaseMessage } from '@langchain/core/messages'

/**
 * Remove reasoning field from a single AIMessage to avoid API issues
 * This prevents the "reasoning without required following item" error
 * when passing messages to subsequent OpenAI API calls
 */
export function removeReasoningFromMessage(message: BaseMessage): BaseMessage {
  if (message instanceof AIMessage) {
    // Create a new AIMessage without the reasoning field
    // Clone the message but exclude reasoning if it exists
    const {
      content,
      additional_kwargs,
      response_metadata,
      tool_calls,
      invalid_tool_calls,
      usage_metadata,
    } = message
    const cleanedKwargs = { ...additional_kwargs }

    // Remove reasoning from additional_kwargs if it exists
    if ('reasoning' in cleanedKwargs) {
      delete cleanedKwargs['reasoning']
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
  return message
}

/**
 * Remove reasoning field from multiple messages
 */
export function removeReasoningFromMessages(
  messages: BaseMessage[],
): BaseMessage[] {
  return messages.map(removeReasoningFromMessage)
}
