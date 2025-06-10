import { END, START, StateGraph } from '@langchain/langgraph'
import {
  PROGRESS_MESSAGES,
  WORKFLOW_ERROR_MESSAGES,
} from '../constants/progressMessages'
import { finalResponseNode } from '../nodes'
import type { ResponseChunk, WorkflowState } from '../types'
import {
  type ChatState,
  DEFAULT_RECURSION_LIMIT,
  createAnnotations,
  generateAnswer,
  validateInput,
} from './sharedLangGraphComponents'
import {
  createErrorState,
  fromLangGraphResult,
  toLangGraphState,
} from './stateManager'
import {
  extractFinalState,
  prepareFinalResponseGenerator,
} from './workflowSteps'

/**
 * Create and configure the LangGraph workflow for validation and answer generation
 */
const createPartialGraph = () => {
  const ChatStateAnnotation = createAnnotations()
  const graph = new StateGraph(ChatStateAnnotation)

  graph
    .addNode('validateInput', validateInput)
    .addNode('generateAnswer', generateAnswer)
    .addEdge(START, 'validateInput')
    .addEdge('generateAnswer', END)

    // Conditional edges
    .addConditionalEdges('validateInput', (state: ChatState) => {
      if (state.error) return END
      return 'generateAnswer'
    })

  return graph.compile()
}

/**
 * Execute validation and answer generation using LangGraph
 */
const executeLangGraphSteps = async (
  initialState: WorkflowState,
  recursionLimit: number = DEFAULT_RECURSION_LIMIT,
): Promise<WorkflowState> => {
  try {
    const compiled = createPartialGraph()
    const langGraphState = toLangGraphState(initialState)

    const result = await compiled.invoke(langGraphState, { recursionLimit })
    return fromLangGraphResult(result)
  } catch (error) {
    console.error('LangGraph execution failed:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'LangGraph execution failed'

    return {
      ...initialState,
      error: errorMessage,
    }
  }
}

/**
 * Execute streaming workflow with partial LangGraph integration
 */
export const executeStreamingWorkflow = async function* (
  initialState: WorkflowState,
): AsyncGenerator<ResponseChunk, WorkflowState, unknown> {
  try {
    // Step 1-2: Use LangGraph for validation and answer generation
    yield { type: 'custom', content: PROGRESS_MESSAGES.VALIDATION.START }

    const langGraphResult = await executeLangGraphSteps(initialState)

    if (langGraphResult.error) {
      yield { type: 'custom', content: PROGRESS_MESSAGES.VALIDATION.ERROR }
      yield { type: 'error', content: langGraphResult.error }

      // Generate error response
      const errorState = createErrorState(initialState, langGraphResult.error)
      const finalResult = await finalResponseNode(errorState, {
        streaming: false,
      })
      return finalResult
    }

    yield { type: 'custom', content: PROGRESS_MESSAGES.VALIDATION.SUCCESS }
    yield {
      type: 'custom',
      content: PROGRESS_MESSAGES.ANSWER_GENERATION.SUCCESS,
    }

    // Step 3: Manual streaming for final response
    yield { type: 'custom', content: PROGRESS_MESSAGES.FINAL_RESPONSE.START }

    // Stream the final response manually
    const { finalState, generator } = prepareFinalResponseGenerator(
      langGraphResult,
      initialState,
    )

    let hasStreamedContent = false

    for await (const chunk of generator) {
      if (chunk.type === 'text' || chunk.type === 'error') {
        if (!hasStreamedContent) {
          hasStreamedContent = true
        }
        yield chunk
      }
    }

    // Mark formatting as complete only after all streaming is done
    yield {
      type: 'custom',
      content: PROGRESS_MESSAGES.FINAL_RESPONSE.SUCCESS,
    }

    // Get final state from generator
    const finalResult = await extractFinalState(generator, finalState)
    return finalResult
  } catch (error) {
    console.error(WORKFLOW_ERROR_MESSAGES.LANGGRAPH_FAILED, error)

    const errorMessage =
      error instanceof Error
        ? error.message
        : WORKFLOW_ERROR_MESSAGES.EXECUTION_FAILED

    yield { type: 'error', content: errorMessage }

    // Even with catch error, go through finalResponseNode to ensure proper response
    const errorState = createErrorState(initialState, errorMessage)
    const finalResult = await finalResponseNode(errorState, {
      streaming: false,
    })
    return finalResult
  }
}
