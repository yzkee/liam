import { type BaseMessage, isAIMessage } from '@langchain/core/messages'
import * as v from 'valibot'
import {
  additionalKwargsSchema,
  type ToolCalls,
} from '@/components/SessionDetailPage/schema'

type ToolCallInput = {
  id?: string
  name?: unknown
  args?: unknown
}

// Helper function to generate tool call ID
function generateToolCallId(tc: ToolCallInput, index: number): string {
  return (
    tc.id ||
    `tool-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`
  )
}

// Helper function to stringify arguments safely
function stringifyArguments(args: unknown): string {
  try {
    if (args === undefined) {
      return 'undefined'
    }
    if (typeof args === 'string') {
      return args
    }
    return JSON.stringify(args)
  } catch {
    // Handle circular references or other stringify errors
    return args ? String(args) : '[Circular]'
  }
}

// Helper function to map tool call to our format
function mapToolCall(tc: ToolCallInput, index: number): ToolCalls[number] {
  const id = generateToolCallId(tc, index)
  const name = tc.name ? String(tc.name) : 'unknown'
  const argumentsStr = stringifyArguments(tc.args)

  return {
    id,
    type: 'function' as const,
    index,
    function: {
      name,
      arguments: argumentsStr,
    },
  }
}

export function extractToolCallsFromMessage(message: BaseMessage): ToolCalls {
  // First check if the message has tool_calls directly (for AIMessage)
  if (
    isAIMessage(message) &&
    message.tool_calls &&
    message.tool_calls.length > 0
  ) {
    // Map LangChain's tool_calls format to our expected format
    return message.tool_calls.map(mapToolCall)
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
