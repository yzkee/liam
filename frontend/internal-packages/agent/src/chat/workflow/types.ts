import type { Schema } from '@liam-hq/db-structure'
import type { AgentName } from '../../langchain'

// Re-export AgentName for use within workflow modules
export type { AgentName }

export type WorkflowMode = 'Ask' | 'Build'

export type WorkflowState = {
  mode?: WorkflowMode | undefined
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
  userId?: string | undefined
}

/**
 * Response chunk type for streaming
 */
export type ResponseChunk = {
  type: 'text' | 'error' | 'custom'
  content: string
}

/**
 * Workflow execution options
 */
export interface WorkflowOptions {
  streaming?: boolean
  recursionLimit?: number
}

/**
 * Result types for workflow steps
 */
type WorkflowStepSuccess = {
  state: WorkflowState
  error?: never
}

type WorkflowStepFailure = {
  error: string
  finalState: WorkflowState
  state?: never
}

export type WorkflowStepResult = WorkflowStepSuccess | WorkflowStepFailure

/**
 * Type guard for workflow step failure
 */
export const isWorkflowStepFailure = (
  result: WorkflowStepResult,
): result is WorkflowStepFailure => {
  return 'error' in result && typeof result.error === 'string'
}

/**
 * Type guard for WorkflowState
 */
export const isWorkflowState = (val: unknown): val is WorkflowState => {
  return (
    val !== null &&
    typeof val === 'object' &&
    'userInput' in val &&
    'history' in val
  )
}
