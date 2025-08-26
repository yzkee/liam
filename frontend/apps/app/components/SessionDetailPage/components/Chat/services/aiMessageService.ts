'use client'

import { err, ok, type Result } from 'neverthrow'
import { boolean, object, optional, parse, string } from 'valibot'
import { ERROR_MESSAGES } from '../constants/chatConstants'

/**
 * Schema for API response validation
 */
const ChatAPIResponseSchema = object({
  success: optional(boolean()),
  text: optional(string()),
  error: optional(string()),
})

type ChatAPIRequestParams = {
  userInput: string
  designSessionId: string
  isDeepModelingEnabled: boolean
}

/**
 * Calls the /api/chat endpoint with the given parameters
 */
const callChatAPI = async ({
  userInput,
  designSessionId,
  isDeepModelingEnabled,
}: ChatAPIRequestParams): Promise<Result<Response, string>> => {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userInput,
      designSessionId,
      isDeepModelingEnabled,
    }),
  })

  if (!response.ok) {
    return err(ERROR_MESSAGES.FETCH_FAILED)
  }

  return ok(response)
}

type SendChatMessageParams = {
  userInput: string
  designSessionId: string
  isDeepModelingEnabled: boolean
}

type SendChatMessageResult = {
  success: boolean
  error?: string
}

/**
 * Sends a chat message to the API endpoint and handles the response
 * Messages are saved server-side and received via Supabase Realtime
 */
export const sendChatMessage = async ({
  userInput,
  designSessionId,
  isDeepModelingEnabled,
}: SendChatMessageParams): Promise<SendChatMessageResult> => {
  try {
    const responseResult = await callChatAPI({
      userInput,
      designSessionId,
      isDeepModelingEnabled,
    })

    if (responseResult.isErr()) {
      return {
        success: false,
        error: responseResult.error,
      }
    }

    // Parse JSON response with type safety
    const rawData = await responseResult.value.json()
    const data = parse(ChatAPIResponseSchema, rawData)

    if (!data.success) {
      return {
        success: false,
        error: data.error || ERROR_MESSAGES.GENERAL,
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in sendChatMessage:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL,
    }
  }
}
