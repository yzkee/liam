import type { AIMessage } from '@langchain/core/messages'
import * as v from 'valibot'
import { type ToolCalls, toolCallsSchema } from './toolCallTypes'

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

export const extractToolCallsFromMessage = (message: AIMessage): ToolCalls => {
  // First try to parse with schema validation
  const parsed = v.safeParse(toolCallsSchema, message.tool_calls)
  if (parsed.success && parsed.output !== undefined) {
    return parsed.output
  }

  // If parsing fails, map manually with helper functions
  if (message.tool_calls && message.tool_calls.length > 0) {
    return message.tool_calls.map(mapToolCall)
  }

  return []
}
