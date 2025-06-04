import type { AgentName } from '@/lib/langchain'
import { Annotation, END, START, StateGraph } from '@langchain/langgraph'
import type { Schema } from '@liam-hq/db-structure'
import {
  answerGenerationNode,
  finalResponseNode,
  validationNode,
} from './nodes'
import type { WorkflowState } from './types'

/**
 * ChatState definition for LangGraph
 */
interface ChatState {
  mode?: 'Ask' | 'Build'
  userInput: string
  generatedAnswer?: string
  finalResponse?: string
  history: string[]
  schemaData?: Schema
  projectId?: string
  error?: string

  // Intermediate data for workflow
  schemaText?: string
  formattedChatHistory?: string
  agentName?: AgentName
}

// LangGraph-compatible annotations
const ChatStateAnnotation = Annotation.Root({
  mode: Annotation<'Ask' | 'Build' | undefined>,
  userInput: Annotation<string>,
  generatedAnswer: Annotation<string>,
  finalResponse: Annotation<string>,
  history: Annotation<string[]>,
  schemaData: Annotation<Schema>,
  projectId: Annotation<string>,
  error: Annotation<string>,

  // Additional fields for workflow processing
  schemaText: Annotation<string>,
  formattedChatHistory: Annotation<string>,
  agentName: Annotation<AgentName>,
})

/**
 * Wrap validationNode to match LangGraph node format
 */
const validateInput = async (state: ChatState): Promise<Partial<ChatState>> =>
  validationNode(state)

/**
 * Wrap answerGenerationNode for non-streaming execution
 */
const generateAnswer = async (
  state: ChatState,
): Promise<Partial<ChatState>> => {
  try {
    // Use synchronous execution (streaming is now handled by finalResponseNode)
    const result = await answerGenerationNode(state)
    return {
      generatedAnswer: result.generatedAnswer,
      error: result.error,
    }
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : 'Failed to generate answer',
    }
  }
}

/**
 * Wrap finalResponseNode for non-streaming execution
 */
const formatFinalResponse = async (
  state: ChatState,
): Promise<Partial<ChatState>> => {
  const result = await finalResponseNode(state, { streaming: false })
  return result
}

/**
 * Workflow execution options
 */
interface WorkflowOptions {
  streaming?: boolean
  recursionLimit?: number
}

/**
 * Unified workflow execution function
 */
export function executeChatWorkflow(
  initialState: WorkflowState,
): AsyncGenerator<
  { type: 'text' | 'error'; content: string },
  WorkflowState,
  unknown
>
export function executeChatWorkflow(
  initialState: WorkflowState,
  options: WorkflowOptions & { streaming: true },
): AsyncGenerator<
  { type: 'text' | 'error'; content: string },
  WorkflowState,
  unknown
>
export function executeChatWorkflow(
  initialState: WorkflowState,
  options: WorkflowOptions & { streaming: false },
): Promise<WorkflowState>
export function executeChatWorkflow(
  initialState: WorkflowState,
  options?: WorkflowOptions,
):
  | Promise<WorkflowState>
  | AsyncGenerator<
      { type: 'text' | 'error'; content: string },
      WorkflowState,
      unknown
    > {
  const streaming = options?.streaming ?? false
  const recursionLimit = options?.recursionLimit ?? 10
  if (streaming === false) {
    return executeChatWorkflowSyncInternal(initialState, recursionLimit)
  }
  return executeChatWorkflowStreamingInternal(initialState, recursionLimit)
}

/**
 * Internal implementation functions
 */
// Non-streaming implementation using LangGraph
const executeChatWorkflowSyncInternal = async (
  initialState: WorkflowState,
  recursionLimit: number,
): Promise<WorkflowState> => {
  try {
    const graph = new StateGraph(ChatStateAnnotation)

    graph
      .addNode('validateInput', validateInput)
      .addNode('generateAnswer', generateAnswer)
      .addNode('formatFinalResponse', formatFinalResponse)
      .addEdge(START, 'validateInput')
      .addEdge('formatFinalResponse', END)

      // Conditional edges - simplified to prevent loops
      .addConditionalEdges('validateInput', (state: ChatState) => {
        if (state.error) return 'formatFinalResponse'
        return 'generateAnswer'
      })
      .addConditionalEdges('generateAnswer', () => {
        // Always go to formatFinalResponse regardless of error state
        return 'formatFinalResponse'
      })

    // Execution
    const compiled = graph.compile()
    const result = await compiled.invoke(
      {
        mode: initialState.mode,
        userInput: initialState.userInput,
        history: initialState.history || [],
        schemaData: initialState.schemaData,
        projectId: initialState.projectId,
      },
      {
        recursionLimit, // Use configurable recursion limit
      },
    )

    return {
      mode: result.mode,
      userInput: result.userInput,
      generatedAnswer: result.generatedAnswer,
      finalResponse: result.finalResponse,
      history: result.history || [],
      schemaData: result.schemaData,
      projectId: result.projectId,
      error: result.error,
    }
  } catch (error) {
    console.error(
      'LangGraph execution failed, falling back to error state:',
      error,
    )
    // Even with LangGraph execution failure, go through finalResponseNode to ensure proper response
    const errorMessage =
      error instanceof Error ? error.message : 'Workflow execution failed'
    const errorState = {
      ...initialState,
      error: errorMessage,
    }
    return await finalResponseNode(errorState, { streaming: false })
  }
}

// Streaming implementation: LangGraph for validation + answerGeneration, streaming for finalResponse
const executeChatWorkflowStreamingInternal = async function* (
  initialState: WorkflowState,
  recursionLimit: number,
): AsyncGenerator<
  { type: 'text' | 'error'; content: string },
  WorkflowState,
  unknown
> {
  try {
    // Step 1 & 2: Use LangGraph for validation and answer generation (synchronously)
    const graph = new StateGraph(ChatStateAnnotation)

    graph
      .addNode('validateInput', validateInput)
      .addNode('generateAnswer', generateAnswer)
      .addEdge(START, 'validateInput')
      .addEdge('validateInput', 'generateAnswer')
      .addEdge('generateAnswer', END)

      // Conditional edges for error handling
      .addConditionalEdges('validateInput', (state: ChatState) => {
        if (state.error) return END
        return 'generateAnswer'
      })

    const compiled = graph.compile()

    // Run validation and answer generation through LangGraph
    const result = await compiled.invoke(
      {
        mode: initialState.mode,
        userInput: initialState.userInput,
        history: initialState.history || [],
        schemaData: initialState.schemaData,
        projectId: initialState.projectId,
      },
      {
        recursionLimit, // Use configurable recursion limit
      },
    )

    // Check for errors from validation or answer generation
    if (result.error) {
      yield { type: 'error', content: result.error }
      const errorState = {
        ...initialState,
        error: result.error,
      }
      const finalResult = await finalResponseNode(errorState, {
        streaming: false,
      })
      return finalResult
    }

    // Step 3: Stream final response using finalResponseNode
    const finalState: WorkflowState = {
      mode: result.mode,
      userInput: result.userInput,
      history: result.history || [],
      schemaData: result.schemaData,
      projectId: result.projectId,
      generatedAnswer: result.generatedAnswer,
      // Include processed fields
      schemaText: result.schemaText,
      formattedChatHistory: result.formattedChatHistory,
      agentName: result.agentName,
    }

    const finalGenerator = finalResponseNode(finalState)

    for await (const chunk of finalGenerator) {
      if (chunk.type === 'text' || chunk.type === 'error') {
        yield chunk
      }
    }

    // Get the final result from the generator
    const generatorResult = await finalGenerator.next()
    // Type guard to check if value is WorkflowState
    const value = generatorResult.value
    const isWorkflowState = (val: unknown): val is WorkflowState => {
      return (
        val !== null &&
        typeof val === 'object' &&
        'userInput' in val &&
        'history' in val
      )
    }

    return (
      (isWorkflowState(value) ? value : null) || {
        ...finalState,
        finalResponse: finalState.generatedAnswer || 'No response generated',
        history: [
          ...finalState.history,
          `User: ${finalState.userInput}`,
          `Assistant: ${finalState.generatedAnswer || 'No response generated'}`,
        ],
      }
    )
  } catch (error) {
    console.error(
      'LangGraph streaming execution failed, falling back to error state:',
      error,
    )
    const errorMessage =
      error instanceof Error ? error.message : 'Workflow execution failed'
    yield {
      type: 'error',
      content: errorMessage,
    }
    // Even with catch error, go through finalResponseNode to ensure proper response
    const errorState = {
      ...initialState,
      error: errorMessage,
    }
    const finalResult = await finalResponseNode(errorState, {
      streaming: false,
    })
    return finalResult
  }
}
