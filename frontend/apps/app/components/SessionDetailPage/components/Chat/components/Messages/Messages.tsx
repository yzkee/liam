import {
  type BaseMessage,
  isAIMessage,
  isHumanMessage,
  isToolMessage,
  type ToolMessage,
} from '@langchain/core/messages'
import type { FC } from 'react'
import { AiMessage } from './AiMessage'
import { HumanMessage } from './HumanMessage'

type Props = {
  messages: BaseMessage[]
  onNavigate?: (tab: 'erd' | 'artifact') => void
  isWorkflowRunning?: boolean
}

export const Messages: FC<Props> = ({
  messages,
  onNavigate,
  isWorkflowRunning = false,
}) => {
  return messages.map((message, index) => {
    if (isAIMessage(message)) {
      // Extract tool call IDs from the AI message
      const toolCallIds =
        message.tool_calls
          ?.map((tc) => tc.id)
          .filter((id): id is string => Boolean(id)) || []

      // Find tool messages that match the tool call IDs
      const toolMessages: ToolMessage[] = []

      if (toolCallIds.length > 0) {
        // Filter all messages for matching tool messages
        const matchingToolMessages = messages.filter(
          (msg): msg is ToolMessage => {
            if (!isToolMessage(msg)) return false
            // Check if the tool message references any of the AI message's tool calls
            // Tool messages might have a toolCallId field
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            const msgWithToolCall = msg as ToolMessage & {
              tool_call_id?: string
              toolCallId?: string
            }
            const msgToolCallId =
              msgWithToolCall.tool_call_id || msgWithToolCall.toolCallId
            return Boolean(msgToolCallId && toolCallIds.includes(msgToolCallId))
          },
        )

        // Sort by original index to preserve chronological order
        matchingToolMessages.sort((a, b) => {
          const aIndex = messages.indexOf(a)
          const bIndex = messages.indexOf(b)
          return aIndex - bIndex
        })

        // Deduplicate and add to toolMessages
        const seen = new Set<string>()
        for (const msg of matchingToolMessages) {
          if (msg.id && !seen.has(msg.id)) {
            seen.add(msg.id)
            toolMessages.push(msg)
          }
        }
      }

      // Fallback: if no tool call IDs or no matches, collect immediate following tool messages
      if (toolMessages.length === 0) {
        let nextIndex = index + 1
        while (nextIndex < messages.length) {
          const nextMessage = messages[nextIndex]
          if (nextMessage && isToolMessage(nextMessage)) {
            toolMessages.push(nextMessage)
            nextIndex++
          } else {
            break
          }
        }
      }

      return (
        <AiMessage
          key={message.id}
          message={message}
          toolMessages={toolMessages}
          onNavigate={onNavigate}
          isWorkflowRunning={isWorkflowRunning}
        />
      )
    }

    if (isHumanMessage(message)) {
      return <HumanMessage key={message.id} message={message} />
    }

    // Skip rendering ToolMessages as they're handled with their corresponding AIMessage
    if (isToolMessage(message)) {
      return null
    }

    return null
  })
}
