'use client'

import type { Schema, TableGroup } from '@liam-hq/db-structure'
import { boolean, object, optional, parse, string } from 'valibot'
import { ERROR_MESSAGES } from '../constants/chatConstants'
import type { ChatEntry } from '../types/chatTypes'
import {
  createChatEntry,
  formatChatHistory,
  generateMessageId,
} from './messageHelpers'
import { saveMessage } from './messageServiceClient'

type DesignSession = {
  id: string
  organizationId: string
  buildingSchemaId: string
  latestVersionNumber?: number
}

interface CreateAIMessageParams {
  message: string
  schemaData: Schema
  tableGroups?: Record<string, TableGroup>
  messages: ChatEntry[]
  designSession: DesignSession
  addOrUpdateMessage: (message: ChatEntry, userId?: string | null) => void
  setProgressMessages: (updater: (prev: string[]) => string[]) => void
}

interface CreateAIMessageResult {
  success: boolean
  finalMessage?: ChatEntry
  error?: string
}

/**
 * Schema for API response validation
 */
const ChatAPIResponseSchema = object({
  success: optional(boolean()),
  text: optional(string()),
  error: optional(string()),
})

/**
 * Creates an AI message placeholder
 */
const createAIMessagePlaceholder = (
  addOrUpdateMessage: (message: ChatEntry, userId?: string | null) => void,
): ChatEntry => {
  const aiMessageId = generateMessageId('ai')
  const aiMessage: ChatEntry = {
    id: aiMessageId,
    content: '',
    isUser: false,
    // No timestamp during generation
    isGenerating: true, // Mark as generating
  }
  addOrUpdateMessage(aiMessage)
  return aiMessage
}

/**
 * Calls the /api/chat endpoint with the given parameters
 */
const callChatAPI = async (
  message: string,
  schemaData: Schema,
  tableGroups: Record<string, TableGroup> | undefined,
  history: [string, string][],
  designSession: DesignSession,
): Promise<Response> => {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      schemaData,
      tableGroups,
      history,
      organizationId: designSession.organizationId,
      buildingSchemaId: designSession.buildingSchemaId,
      latestVersionNumber: designSession.latestVersionNumber || 0,
    }),
  })

  if (!response.ok) {
    throw new Error(ERROR_MESSAGES.FETCH_FAILED)
  }

  return response
}

/**
 * Handles errors and updates AI message with error content
 */
const handleAIMessageError = (
  error: unknown,
  messages: ChatEntry[],
  addOrUpdateMessage: (message: ChatEntry, userId?: string | null) => void,
  setProgressMessages: (updater: (prev: string[]) => string[]) => void,
): CreateAIMessageResult => {
  console.error('Error in createAndStreamAIMessage:', error)

  // Clear progress messages on error
  setProgressMessages(() => [])

  // Update error in the AI message or add a new error message
  // Check if we already added an AI message that we can update
  const existingAiMessage = messages.find((msg) => msg.id.startsWith('ai-'))

  if (existingAiMessage && existingAiMessage.content === '') {
    // Update the existing empty message with error, add timestamp, and remove generating state
    const errorAiMessage = createChatEntry(existingAiMessage, {
      content: ERROR_MESSAGES.GENERAL,
      timestamp: new Date(),
      isGenerating: false, // Remove generating state on error
    })
    addOrUpdateMessage(errorAiMessage)
  } else {
    // Create a new error message with timestamp
    const errorMessage: ChatEntry = {
      id: generateMessageId('error'),
      content: ERROR_MESSAGES.GENERAL,
      isUser: false,
      timestamp: new Date(),
      isGenerating: false, // Ensure error message is not in generating state
    }
    addOrUpdateMessage(errorMessage)
  }

  return {
    success: false,
    error: error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL,
  }
}

/**
 * Creates an AI message by calling the /api/chat endpoint and processing the non-streaming response
 */
export const createAndStreamAIMessage = async ({
  message,
  schemaData,
  tableGroups,
  messages,
  designSession,
  addOrUpdateMessage,
  setProgressMessages,
}: CreateAIMessageParams): Promise<CreateAIMessageResult> => {
  try {
    // Create AI message placeholder (without timestamp)
    const aiMessage = createAIMessagePlaceholder(addOrUpdateMessage)

    // Format chat history for API
    const history = formatChatHistory(messages)

    // Call API with non-streaming response
    const response = await callChatAPI(
      message,
      schemaData,
      tableGroups,
      history,
      designSession,
    )

    // Parse JSON response with type safety
    const rawData = await response.json()
    const data = parse(ChatAPIResponseSchema, rawData)

    if (!data.success || !data.text) {
      throw new Error(data.error || ERROR_MESSAGES.GENERAL)
    }

    const content = data.text
    let aiDbId: string | undefined

    // Save to database
    const saveResult = await saveMessage({
      designSessionId: designSession.id,
      content,
      role: 'assistant',
      userId: null,
    })
    if (saveResult.success && saveResult.message) {
      aiDbId = saveResult.message.id
    }

    // Update message with final content, timestamp, and database ID
    const finalAiMessage = createChatEntry(aiMessage, {
      content,
      timestamp: new Date(),
      isGenerating: false, // Remove generating state when complete
      dbId: aiDbId,
    })
    addOrUpdateMessage(finalAiMessage)

    // Clear progress messages
    setProgressMessages(() => [])

    return { success: true, finalMessage: finalAiMessage }
  } catch (error) {
    return handleAIMessageError(
      error,
      messages,
      addOrUpdateMessage,
      setProgressMessages,
    )
  }
}
