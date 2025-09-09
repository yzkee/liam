import { type BaseMessage, isAIMessage } from '@langchain/core/messages'
import * as v from 'valibot'
import { additionalKwargsSchema, type ToolCalls } from '../schema'

export function extractToolCallsFromMessage(message: BaseMessage): ToolCalls {
  // First check if the message has tool_calls directly (for AIMessage)
  if (isAIMessage(message) && message.tool_calls && message.tool_calls.length > 0) {
    // Map LangChain's tool_calls format to our expected format
    return message.tool_calls.map((tc, index) => ({
      id: tc.id || `tool-${Date.now()}-${index}`,
      type: 'function' as const,
      index,
      function: {
        name: tc.name,
        arguments: typeof tc.args === 'string' ? tc.args : JSON.stringify(tc.args),
      },
    }))
  }

  // Fall back to checking additional_kwargs (for backward compatibility)
  const parsed = v.safeParse(additionalKwargsSchema, message.additional_kwargs)
  if (!parsed.success) {
    return []
  }
  
  if (parsed.output.tool_calls === undefined) {
    return []
  }

  return parsed.output.tool_calls
}
