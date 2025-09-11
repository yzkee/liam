import type { ToolMessage as ToolMessageType } from '@langchain/core/messages'
import { useMemo } from 'react'
import type { ToolCalls } from '@/components/SessionDetailPage/schema'
import { extractResponseFromMessage } from '../../../../utils/extractResponseFromMessage'
import { getToolDisplayInfo } from '../utils/getToolDisplayInfo'
import { parseToolArguments } from '../utils/parseToolArguments'

type ToolCallItem = ToolCalls[number]

export const useToolData = (
  toolCall: ToolCallItem,
  toolMessage: ToolMessageType | undefined,
) => {
  const parsedArguments = useMemo(
    () => parseToolArguments(toolCall.function.arguments),
    [toolCall.function.arguments],
  )

  const toolInfo = useMemo(
    () => getToolDisplayInfo(toolCall.function.name),
    [toolCall.function.name],
  )

  const result = useMemo(() => {
    if (toolMessage) {
      // Handle both real ToolMessage instances and mock objects
      if (typeof toolMessage.content === 'string') {
        return toolMessage.content
      }
      return extractResponseFromMessage(toolMessage)
    }
    // Use default message
    return 'Tool execution completed.'
  }, [toolMessage])

  const resultStatus = useMemo(() => {
    const lowerResult = result.toLowerCase()
    if (lowerResult.includes('error')) return 'error'
    if (
      lowerResult.includes('successfully') ||
      lowerResult.includes('completed')
    )
      return 'success'
    return 'neutral'
  }, [result])

  return { parsedArguments, toolInfo, result, resultStatus }
}
