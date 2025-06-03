import { mastra } from '@/lib/mastra'
import type { AgentName, WorkflowState } from '../types'

interface PreparedAnswerGeneration {
  agent: ReturnType<typeof mastra.getAgent>
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
  const agent = mastra.getAgent(agentName)
  if (!agent) {
    return { error: `${agentName} not found in Mastra instance` }
  }

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
 * Unified answer generation (supports both streaming and sync)
 */

// Overloaded function signatures
export function answerGenerationNode(
  state: WorkflowState,
  options: { streaming: false },
): Promise<WorkflowState>
export function answerGenerationNode(
  state: WorkflowState,
  options?: { streaming?: true },
): AsyncGenerator<
  { type: 'text' | 'error'; content: string },
  WorkflowState,
  unknown
>
export function answerGenerationNode(
  state: WorkflowState,
  options: { streaming?: boolean } = { streaming: true },
):
  | Promise<WorkflowState>
  | AsyncGenerator<
      { type: 'text' | 'error'; content: string },
      WorkflowState,
      unknown
    > {
  const streaming = options.streaming ?? true

  if (!streaming) {
    return answerGenerationNodeSync(state)
  }
  return answerGenerationNodeStreaming(state)
}

// Non-streaming implementation
async function answerGenerationNodeSync(
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

    // Use Mastra's generate method for non-streaming
    const result = await agent.generate(
      createPrompt(schemaText, formattedChatHistory, state.userInput),
    )

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

// Streaming implementation
async function* answerGenerationNodeStreaming(
  state: WorkflowState,
): AsyncGenerator<
  { type: 'text' | 'error'; content: string },
  WorkflowState,
  unknown
> {
  try {
    const prepared = await prepareAnswerGeneration(state)

    if ('error' in prepared) {
      yield { type: 'error' as const, content: prepared.error }
      return {
        ...state,
        error: prepared.error,
      }
    }

    const { agent, schemaText, formattedChatHistory } = prepared

    // Use Mastra's streaming capabilities
    const stream = await agent.stream(
      createPrompt(schemaText, formattedChatHistory, state.userInput),
    )

    // Stream text chunks in real-time
    let fullText = ''
    for await (const chunk of stream.textStream) {
      fullText += chunk
      yield { type: 'text' as const, content: chunk }
    }

    return {
      ...state,
      generatedAnswer: fullText,
      error: undefined,
    }
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : 'Failed to generate answer'
    yield { type: 'error' as const, content: errorMsg }
    return {
      ...state,
      error: errorMsg,
    }
  }
}
