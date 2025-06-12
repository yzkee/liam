import type { Schema } from '@liam-hq/db-structure'
import { executeChatWorkflow } from './workflow'
import type { WorkflowState } from './workflow/types'

interface ChatProcessorParams {
  message: string
  schemaData: Schema
  history?: [string, string][]
  organizationId?: string
  buildingSchemaId: string
  latestVersionNumber?: number
}

type ChatProcessorResult =
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
): Promise<ChatProcessorResult> => {
  const {
    message,
    schemaData,
    history,
    organizationId,
    buildingSchemaId,
    latestVersionNumber = 0,
  } = params

  try {
    // Convert history format
    const formattedHistory = history?.map(([, content]) => content) || []

    // Create workflow state
    const workflowState: WorkflowState = {
      userInput: message,
      history: formattedHistory,
      schemaData,
      organizationId,
      buildingSchemaId,
      latestVersionNumber,
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
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
