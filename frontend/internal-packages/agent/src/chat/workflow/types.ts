import type { Schema } from '@liam-hq/db-structure'
import type { AgentName } from '../../langchain'
import type { Repositories } from '../../repositories'

// Re-export AgentName for use within workflow modules
export type { AgentName }

export type WorkflowState = {
  userInput: string
  generatedAnswer?: string | undefined
  finalResponse?: string | undefined
  history: string[]
  schemaData?: Schema | undefined
  projectId?: string | undefined
  error?: string | undefined

  // Additional fields for workflow processing
  schemaText?: string | undefined
  formattedChatHistory?: string | undefined
  agentName?: AgentName | undefined

  // Schema update fields
  buildingSchemaId?: string | undefined
  latestVersionNumber?: number | undefined
  organizationId?: string | undefined
  userId: string

  // Message saving fields
  designSessionId: string

  // Repository dependencies for data access
  repositories: Repositories
}

/**
 * Workflow execution options
 */
export interface WorkflowOptions {
  recursionLimit?: number
}
