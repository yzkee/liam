import {
  type AgentName,
  createPromptVariables,
  getAgent,
} from '@/lib/langchain'
import { createNewVersion } from '@/libs/schema/createNewVersion'
import type { Operation } from 'fast-json-patch'
import type { WorkflowState } from '../types'

interface PreparedAnswerGeneration {
  agent: ReturnType<typeof getAgent>
  agentName: AgentName
  schemaText: string
  formattedChatHistory: string
}

interface BuildAgentResponse {
  message: string
  schemaChanges: Operation[]
}

/**
 * Parse structured response from buildAgent
 */
const parseStructuredResponse = (
  response: string,
): BuildAgentResponse | null => {
  try {
    // Try to parse as JSON first
    const parsed: unknown = JSON.parse(response)

    // Validate the structure with proper type guards
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'message' in parsed &&
      'schemaChanges' in parsed &&
      typeof (parsed as { message: unknown }).message === 'string' &&
      Array.isArray((parsed as { schemaChanges: unknown }).schemaChanges)
    ) {
      const validatedParsed = parsed as {
        message: string
        schemaChanges: Operation[]
      }
      return {
        message: validatedParsed.message,
        schemaChanges: validatedParsed.schemaChanges,
      }
    }

    return null
  } catch {
    // If JSON parsing fails, return null
    return null
  }
}

/**
 * Apply schema changes and return updated state
 */
const applySchemaChanges = async (
  schemaChanges: Operation[],
  buildingSchemaId: string,
  latestVersionNumber: number,
  message: string,
  state: WorkflowState,
): Promise<WorkflowState> => {
  try {
    const result = await createNewVersion({
      buildingSchemaId,
      latestVersionNumber,
      patch: schemaChanges,
    })

    if (!result.success) {
      return {
        ...state,
        generatedAnswer: message,
        error: result.error || 'Failed to update schema',
      }
    }

    return {
      ...state,
      generatedAnswer: message,
      error: undefined,
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred'
    return {
      ...state,
      generatedAnswer: message,
      error: `Failed to update schema: ${errorMessage}`,
    }
  }
}

/**
 * Handle schema changes if they exist
 */
const handleSchemaChanges = async (
  parsedResponse: BuildAgentResponse,
  state: WorkflowState,
): Promise<WorkflowState> => {
  if (parsedResponse.schemaChanges.length === 0) {
    return {
      ...state,
      generatedAnswer: parsedResponse.message,
      error: undefined,
    }
  }

  const buildingSchemaId = state.buildingSchemaId
  const latestVersionNumber = state.latestVersionNumber || 0

  if (!buildingSchemaId) {
    console.warn('Missing buildingSchemaId for schema update')
    return {
      ...state,
      generatedAnswer: parsedResponse.message,
      error: undefined,
    }
  }

  return await applySchemaChanges(
    parsedResponse.schemaChanges,
    buildingSchemaId,
    latestVersionNumber,
    parsedResponse.message,
    state,
  )
}

/**
 * Handle buildAgent response processing
 */
const handleBuildAgentResponse = async (
  response: string,
  state: WorkflowState,
): Promise<WorkflowState> => {
  const parsedResponse = parseStructuredResponse(response)

  if (!parsedResponse) {
    console.warn(
      'Failed to parse buildAgent response as structured JSON, using raw response',
    )
    return {
      ...state,
      generatedAnswer: response,
      error: undefined,
    }
  }

  return await handleSchemaChanges(parsedResponse, state)
}

async function prepareAnswerGeneration(
  state: WorkflowState,
): Promise<PreparedAnswerGeneration | { error: string }> {
  // Since validationNode has already validated required fields,
  // we can trust that the processed data is available
  if (!state.agentName || !state.schemaText || !state.formattedChatHistory) {
    return { error: 'Required processed data is missing from validation step' }
  }

  const agentName = state.agentName
  const formattedChatHistory = state.formattedChatHistory
  const schemaText = state.schemaText

  // Get the agent from LangChain
  const agent = getAgent(agentName)

  return {
    agent,
    agentName,
    schemaText,
    formattedChatHistory,
  }
}

/**
 * Answer generation node - synchronous execution only
 * Streaming is now handled by finalResponseNode
 */
export async function answerGenerationNode(
  state: WorkflowState,
): Promise<WorkflowState> {
  try {
    const prepared = await prepareAnswerGeneration(state)

    if ('error' in prepared) {
      return {
        ...state,
        error: prepared.error,
      }
    }

    const { agent, agentName, schemaText, formattedChatHistory } = prepared

    // Convert formatted chat history to array format if needed
    const historyArray: [string, string][] = formattedChatHistory
      ? [['Assistant', formattedChatHistory]]
      : []

    // Create prompt variables with correct format
    const promptVariables = createPromptVariables(
      schemaText,
      state.userInput,
      historyArray,
    )

    // Use agent's generate method with prompt variables
    const response = await agent.generate(promptVariables)

    // If this is the buildAgent, handle structured response and schema updates
    if (agentName === 'databaseSchemaBuildAgent') {
      return await handleBuildAgentResponse(response, state)
    }

    return {
      ...state,
      generatedAnswer: response,
      error: undefined,
    }
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : 'Failed to generate answer'
    return {
      ...state,
      error: errorMsg,
    }
  }
}
