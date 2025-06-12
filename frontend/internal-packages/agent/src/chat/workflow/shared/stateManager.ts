import { schemaSchema } from '@liam-hq/db-structure'
import * as v from 'valibot'
import type { WorkflowState } from '../types'

/**
 * Schema for validating LangGraph result
 */
const langGraphResultSchema = v.object({
  userInput: v.unknown(),
  generatedAnswer: v.optional(v.unknown()),
  finalResponse: v.optional(v.unknown()),
  history: v.optional(v.unknown()),
  schemaData: v.optional(v.unknown()),
  projectId: v.optional(v.unknown()),
  error: v.optional(v.unknown()),
  schemaText: v.optional(v.unknown()),
  formattedChatHistory: v.optional(v.unknown()),
  agentName: v.optional(v.unknown()),
  buildingSchemaId: v.optional(v.unknown()),
  latestVersionNumber: v.optional(v.unknown()),
  organizationId: v.optional(v.unknown()),
  userId: v.optional(v.unknown()),
  designSessionId: v.optional(v.unknown()),
})

/**
 * Create error state with proper fallbacks
 */
export const createErrorState = (
  baseState: WorkflowState,
  errorMessage: string,
): WorkflowState => {
  return {
    ...baseState,
    error: errorMessage,
  }
}

/**
 * Convert WorkflowState to LangGraph compatible format
 */
export const toLangGraphState = (state: WorkflowState) => {
  return {
    userInput: state.userInput,
    generatedAnswer: state.generatedAnswer,
    finalResponse: state.finalResponse,
    history: state.history || [],
    schemaData: state.schemaData,
    projectId: state.projectId,
    error: state.error,
    schemaText: state.schemaText,
    formattedChatHistory: state.formattedChatHistory,
    agentName: state.agentName,
    buildingSchemaId: state.buildingSchemaId,
    latestVersionNumber: state.latestVersionNumber,
    organizationId: state.organizationId,
    userId: state.userId,
    designSessionId: state.designSessionId,
    repositories: state.repositories,
  }
}

/**
 * Helper function to safely parse string values
 */
const parseOptionalString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value
  return undefined
}

/**
 * Helper function to safely parse string arrays
 */
const parseStringArray = (value: unknown): string[] => {
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    return value
  }
  return []
}

/**
 * Helper function to safely parse AgentName
 */
const parseAgentName = (value: unknown): WorkflowState['agentName'] => {
  if (value === 'databaseSchemaBuildAgent') {
    return value
  }
  return undefined
}

/**
 * Helper function to safely parse Schema
 */
const parseSchema = (value: unknown): WorkflowState['schemaData'] => {
  if (!value || typeof value !== 'object') return undefined

  try {
    const parseResult = v.safeParse(schemaSchema, value)
    return parseResult.success ? parseResult.output : undefined
  } catch {
    return undefined
  }
}

/**
 * Convert LangGraph result back to WorkflowState without type casting
 */
export const fromLangGraphResult = (
  result: Record<string, unknown>,
  initialState: WorkflowState,
): WorkflowState => {
  // First validate the basic structure
  const parseResult = v.safeParse(langGraphResultSchema, result)
  if (!parseResult.success) {
    throw new Error(
      `Invalid LangGraph result structure: ${parseResult.issues.map((issue) => issue.message).join(', ')}`,
    )
  }

  const validatedResult = parseResult.output

  // Extract userInput (required field)
  const userInput =
    typeof validatedResult.userInput === 'string'
      ? validatedResult.userInput
      : ''

  // Build the WorkflowState with proper type validation
  const workflowState: WorkflowState = {
    userInput,
    generatedAnswer: parseOptionalString(validatedResult.generatedAnswer),
    finalResponse: parseOptionalString(validatedResult.finalResponse),
    history: parseStringArray(validatedResult.history),
    schemaData: parseSchema(validatedResult.schemaData),
    projectId: parseOptionalString(validatedResult.projectId),
    error: parseOptionalString(validatedResult.error),
    schemaText: parseOptionalString(validatedResult.schemaText),
    formattedChatHistory: parseOptionalString(
      validatedResult.formattedChatHistory,
    ),
    agentName: parseAgentName(validatedResult.agentName),
    // Schema update fields - buildingSchemaId is required, provide fallback
    buildingSchemaId:
      parseOptionalString(validatedResult.buildingSchemaId) || '',
    latestVersionNumber:
      typeof validatedResult.latestVersionNumber === 'number'
        ? validatedResult.latestVersionNumber
        : undefined,
    organizationId: parseOptionalString(validatedResult.organizationId),
    userId: parseOptionalString(validatedResult.userId) ?? '',
    designSessionId: parseOptionalString(validatedResult.designSessionId) ?? '',
    repositories: initialState.repositories, // Preserve from initial state
  }

  // Skip final validation since repositories contain functions that cannot be validated
  // The individual field parsing above ensures type safety
  return workflowState
}
