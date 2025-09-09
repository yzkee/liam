import {
  type BaseMessage,
  type ToolMessage,
  isAIMessage,
  isHumanMessage,
  isToolMessage,
} from '@langchain/core/messages'
import type { FC } from 'react'
import { AiMessage } from './AiMessage'
import { HumanMessage } from './HumanMessage'

type Props = {
  messages: BaseMessage[]
}

export const Messages: FC<Props> = ({ messages }) => {
  return messages.map((message, index) => {
    if (isAIMessage(message)) {
      // Find tool messages that follow this AI message
      const toolMessages: ToolMessage[] = []
      let nextIndex = index + 1
      
      // Collect all tool messages that immediately follow this AI message
      while (nextIndex < messages.length) {
        const nextMessage = messages[nextIndex]
        if (nextMessage && isToolMessage(nextMessage)) {
          toolMessages.push(nextMessage as ToolMessage)
          nextIndex++
        } else {
          break
        }
      }
      
      return <AiMessage key={message.id} message={message} toolMessages={toolMessages} />
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
