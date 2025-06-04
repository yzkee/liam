import {
  type AgentName,
  createPromptVariables,
  getAgent,
} from '@/lib/langchain'
import type { WorkflowState } from '../types'

interface PreparedAnswerGeneration {
  agent: NonNullable<ReturnType<typeof getAgent>>
  agentName: AgentName
  schemaText: string
  formattedChatHistory: string
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

    const { agent, schemaText, formattedChatHistory } = prepared

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
