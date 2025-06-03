import { Annotation, END, START, StateGraph } from '@langchain/langgraph'
import type { Schema } from '@liam-hq/db-structure'
import {
  answerGenerationNode,
  finalResponseNode,
  validationNode,
} from './nodes'
import type { AgentName, WorkflowState } from './types'

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
    // Use non-streaming mode for sync execution
    const result = await answerGenerationNode(state, { streaming: false })
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
 * Wrap finalResponseNode
 */
const formatFinalResponse = async (
  state: ChatState,
): Promise<Partial<ChatState>> => {
  const result = await finalResponseNode(state)
  return result
}

/**
 * Workflow execution options
 */
interface WorkflowOptions {
  streaming?: boolean
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
  const streaming = options?.streaming ?? true
  if (streaming === false) {
    return executeChatWorkflowSyncInternal(initialState)
  }
  return executeChatWorkflowStreamingInternal(initialState)
}

/**
 * Internal implementation functions
 */
// Non-streaming implementation using LangGraph
const executeChatWorkflowSyncInternal = async (
  initialState: WorkflowState,
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
        recursionLimit: 10, // Increase limit to handle workflow properly
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
    return await finalResponseNode(errorState)
  }
}

// Streaming implementation
const executeChatWorkflowStreamingInternal = async function* (
  initialState: WorkflowState,
): AsyncGenerator<
  { type: 'text' | 'error'; content: string },
  WorkflowState,
  unknown
> {
  try {
    // Step 1: Validate input using validationNode
    const validationResult = await validationNode({
      mode: initialState.mode,
      userInput: initialState.userInput,
      history: initialState.history || [],
      schemaData: initialState.schemaData,
      projectId: initialState.projectId,
    })

    if (validationResult.error) {
      // Even with validation error, go through finalResponseNode to ensure proper response
      const errorState = {
        ...initialState,
        error: validationResult.error,
      }
      const finalResult = await finalResponseNode(errorState)
      yield { type: 'error', content: validationResult.error }
      return finalResult
    }

    // Step 2: Generate answer with streaming
    const state: ChatState = {
      mode: initialState.mode,
      userInput: initialState.userInput,
      history: initialState.history || [],
      schemaData: initialState.schemaData,
      projectId: initialState.projectId,
      // Add validation result fields
      schemaText: validationResult.schemaText,
      formattedChatHistory: validationResult.formattedChatHistory,
      agentName: validationResult.agentName,
    }

    const generator = answerGenerationNode({
      mode: state.mode,
      userInput: state.userInput,
      history: state.history,
      schemaData: state.schemaData,
      projectId: state.projectId,
      // Pass the processed data from validation
      schemaText: state.schemaText,
      formattedChatHistory: state.formattedChatHistory,
      agentName: state.agentName,
    })
    let generatedAnswer = ''

    for await (const chunk of generator) {
      if (chunk.type === 'text') {
        generatedAnswer += chunk.content
        yield chunk
      } else if (chunk.type === 'error') {
        yield chunk
        // Even with generation error, go through finalResponseNode to ensure proper response
        const errorState = {
          ...initialState,
          error: chunk.content,
        }
        const finalResult = await finalResponseNode(errorState)
        return finalResult
      }
    }

    // Step 3: Format final response using finalResponseNode
    const finalState = { ...state, generatedAnswer }
    const finalResult = await finalResponseNode(finalState)

    if (finalResult.error) {
      yield { type: 'error', content: finalResult.error }
    }

    return finalResult
  } catch (error) {
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
    const finalResult = await finalResponseNode(errorState)
    return finalResult
  }
}
