import { mastra } from '@/lib/mastra'
import type { AgentName, WorkflowState } from '../types'

interface MastraAgent {
  generate: (
    prompt: Array<{ role: string; content: string }>,
  ) => Promise<{ text: string }>
}

interface PreparedAnswerGeneration {
  agent: MastraAgent
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

  // Get the agent from Mastra
  const potentialAgent = mastra.getAgent(agentName)

  // Type guard for agent
  if (!potentialAgent) {
    return { error: `${agentName} not found in Mastra instance` }
  }

  // Type guard to ensure agent has required methods
  if (
    typeof potentialAgent !== 'object' ||
    potentialAgent === null ||
    !('generate' in potentialAgent) ||
    typeof potentialAgent.generate !== 'function'
  ) {
    return { error: `${agentName} agent doesn't have required methods` }
  }

  // Safe to cast after type validation
  const agent = potentialAgent as MastraAgent

  return {
    agent,
    agentName,
    schemaText,
    formattedChatHistory,
  }
}

function createPrompt(
  schemaText: string,
  formattedChatHistory: string,
  userInput: string,
) {
  return [
    {
      role: 'system' as const,
      content: `
Complete Schema Information:
${schemaText}

Previous conversation:
${formattedChatHistory}
`,
    },
    {
      role: 'user' as const,
      content: userInput,
    },
  ]
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

    // Use Mastra's generate method for synchronous execution
    const result = await agent.generate(
      createPrompt(schemaText, formattedChatHistory, state.userInput),
    )

    // Type guard for result
    if (!result || typeof result !== 'object' || !('text' in result)) {
      return {
        ...state,
        error: 'Agent response missing expected text property',
      }
    }

    return {
      ...state,
      generatedAnswer: result.text,
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
