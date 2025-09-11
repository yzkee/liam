import { type BaseMessage, isAIMessage } from '@langchain/core/messages'
import { parsePartialJson } from '@langchain/core/output_parsers'
import { getContentString } from './getContentString'

// Helper function to extract response from content block
function extractResponseFromBlock(block: unknown): string | null {
  if (
    !block ||
    typeof block !== 'object' ||
    !('type' in block) ||
    !('input' in block)
  ) {
    return null
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const blockWithType = block as { type?: string; input?: unknown }
  if (
    !['input_json_delta', 'tool_use'].includes(blockWithType.type ?? '') ||
    !blockWithType.input
  ) {
    return null
  }

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

  return null
}

// Helper function to process response value
function processResponse(rawResponse: unknown): string {
  // If response is undefined, return empty string
  if (rawResponse === undefined) {
    return ''
  }

  let response = rawResponse

  // If response is a JSON string, try to parse it
  if (typeof rawResponse === 'string') {
    try {
      const parsed = JSON.parse(rawResponse)
      response = parsed
    } catch {
      // Keep as string if parse fails
      return rawResponse
    }
  }

  // If response is an object with a content field, extract it
  if (response && typeof response === 'object' && 'content' in response) {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const responseObj = response as { content: unknown }
    // Type assertion needed as getContentString expects MessageContent
    // biome-ignore lint/suspicious/noExplicitAny: MessageContent type mismatch requires any
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
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

export function extractResponseFromMessage(message: BaseMessage): string {
  if (!isAIMessage(message)) return getContentString(message.content)

  // Iterate through all content entries to find response
  if (Array.isArray(message.content)) {
    for (const block of message.content) {
      const response = extractResponseFromBlock(block)
      if (response !== null) {
        return response
      }
    }
  }

  const toolCall = message.tool_calls?.[0]
  const rawResponse = toolCall?.args?.response

  if (!toolCall || rawResponse === undefined) {
    return getContentString(message.content)
  }

  // Handle different response types
  return processResponse(rawResponse)
}
