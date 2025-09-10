import { type BaseMessage, isAIMessage } from '@langchain/core/messages'
import { parsePartialJson } from '@langchain/core/output_parsers'
import { getContentString } from './getContentString'

export function extractResponseFromMessage(message: BaseMessage): string {
  if (!isAIMessage(message)) return getContentString(message.content)

  // Iterate through all content entries to find response
  if (Array.isArray(message.content)) {
    for (const block of message.content) {
      if (
        block &&
        typeof block === 'object' &&
        'type' in block &&
        'input' in block
      ) {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const blockWithType = block as { type?: string; input?: unknown }
        if (
          ['input_json_delta', 'tool_use'].includes(blockWithType.type ?? '') &&
          blockWithType.input
        ) {
          try {
            // If input is already an object, use it directly
            let parsedInput: unknown = blockWithType.input

            // If input is a string, try to parse it
            if (typeof blockWithType.input === 'string') {
              parsedInput = parsePartialJson(blockWithType.input)
            }

            // Check for response field
            if (
              parsedInput &&
              typeof parsedInput === 'object' &&
              'response' in parsedInput
            ) {
              // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
              const parsed = parsedInput as { response: unknown }
              if (typeof parsed.response === 'string') {
                return parsed.response
              }
            }
          } catch {
            // Continue to next block
          }
        }
      }
    }
  }
  const toolCall = message.tool_calls?.[0]
  const rawResponse = toolCall?.args?.response

  if (!toolCall || rawResponse === undefined) {
    return getContentString(message.content)
  }

  // Handle different response types
  let response = rawResponse

  // If response is a JSON string, try to parse it
  if (typeof rawResponse === 'string') {
    try {
      const parsed = JSON.parse(rawResponse)
      response = parsed
    } catch {
      // Keep as string if parse fails
      response = rawResponse
    }
  }

  // If response is an object with a content field, extract it
  if (response && typeof response === 'object' && 'content' in response) {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const responseObj = response as { content: unknown }
    // Type assertion needed as getContentString expects MessageContent
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions
    return getContentString(responseObj.content as any)
  }

  // Convert to string
  if (typeof response === 'string') {
    return response
  }

  if (response && typeof response === 'object') {
    try {
      return JSON.stringify(response)
    } catch {
      return String(response)
    }
  }

  return String(response)
}
