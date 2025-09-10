import { type BaseMessage, isAIMessage } from '@langchain/core/messages'
import * as v from 'valibot'
import {
  additionalKwargsSchema,
  type ToolCalls,
} from '@/components/SessionDetailPage/schema'

export function extractToolCallsFromMessage(message: BaseMessage): ToolCalls {
  // First check if the message has tool_calls directly (for AIMessage)
  if (
    isAIMessage(message) &&
    message.tool_calls &&
    message.tool_calls.length > 0
  ) {
    // Map LangChain's tool_calls format to our expected format
    return message.tool_calls.map((tc, index) => {
      // Generate a robust unique ID if missing
      const id =
        tc.id ||
        `tool-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`

      // Ensure name is a string
      const name = tc.name ? String(tc.name) : 'unknown'

      // Safely stringify arguments
      let argumentsStr: string
      try {
        if (tc.args === undefined) {
          argumentsStr = 'undefined'
        } else if (typeof tc.args === 'string') {
          argumentsStr = tc.args
        } else {
          argumentsStr = JSON.stringify(tc.args)
        }
      } catch {
        // Handle circular references or other stringify errors
        argumentsStr = tc.args ? String(tc.args) : '[Circular]'
      }

      return {
        id,
        type: 'function' as const,
        index,
        function: {
          name,
          arguments: argumentsStr,
        },
      }
    })
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
