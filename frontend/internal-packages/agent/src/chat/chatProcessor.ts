import type { Schema } from '@liam-hq/db-structure'
import type { Repositories } from '../repositories'
import type { NodeLogger } from '../utils/nodeLogger'
import { executeChatWorkflow } from './workflow'
import type { WorkflowState } from './workflow/types'
import { formatChatHistory } from './workflow/utils/formatChatHistory'
export interface ChatProcessorParams {
  message: string
  schemaData: Schema
  history: [string, string][]
  organizationId?: string
  buildingSchemaId: string
  latestVersionNumber?: number
  repositories: Repositories
  designSessionId: string
  userId: string
}

export type ChatProcessorResult =
  | {
      text: string
      success: true
    }
  | {
      success: false
      error: string | undefined
    }

/**
 * Process chat message
 */
export const processChatMessage = async (
  params: ChatProcessorParams,
  logger: NodeLogger,
): Promise<ChatProcessorResult> => {
  const {
    message,
    schemaData,
    history,
    organizationId,
    buildingSchemaId,
    latestVersionNumber = 0,
    repositories,
    designSessionId,
    userId,
  } = params

  // Save user message to database
  const saveResult = await repositories.schema.createMessage({
    designSessionId,
    content: message,
    role: 'user',
    userId,
  })

  if (!saveResult.success) {
    console.error('Failed to save user message:', saveResult.error)
    return {
      success: false,
      error: saveResult.error,
    }
  }

  // Convert history format with role prefix
  const historyArray = history.map(([role, content]) => {
    const prefix = role === 'assistant' ? 'Assistant' : 'User'
    return `${prefix}: ${content}`
  })

  // Create workflow state
  const workflowState: WorkflowState = {
    userInput: message,
    formattedHistory: formatChatHistory(historyArray),
    schemaData,
    organizationId,
    buildingSchemaId,
    latestVersionNumber,
    repositories,
    designSessionId,
    userId,
    logger,
  }

  // Execute workflow
  const result = await executeChatWorkflow(workflowState)

  if (result.error) {
    return {
      success: false,
      error: result.error,
    }
  }

  return {
    text: result.finalResponse || result.generatedAnswer || '',
    success: true,
  }
}
