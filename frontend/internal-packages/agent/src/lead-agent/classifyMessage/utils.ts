import type { BaseMessage } from '@langchain/core/messages'
import type { LeadAgentState } from '../annotation'

export const hasToolCalls = (message: BaseMessage): boolean => {
  return (
    'tool_calls' in message &&
    Array.isArray(message.tool_calls) &&
    message.tool_calls.length > 0
  )
}

export const routeAfterClassification = (
  state: LeadAgentState,
): 'toolNode' | 'END' => {
  const { messages } = state

  const lastMessage = messages[messages.length - 1]
  if (lastMessage && hasToolCalls(lastMessage)) {
    return 'toolNode'
  }

  return 'END'
}
