import { END, START, StateGraph } from '@langchain/langgraph'
import { WORKFLOW_ERROR_MESSAGES } from '../constants/progressMessages'
import { finalResponseNode } from '../nodes'
import {
  type ChatState,
  DEFAULT_RECURSION_LIMIT,
  createAnnotations,
  generateAnswer,
  validateInput,
} from '../shared/langGraphUtils'
import {
  createErrorState,
  fromLangGraphResult,
  toLangGraphState,
} from '../shared/stateManager'
import type { WorkflowState } from '../types'

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
 * Create and configure the LangGraph workflow
 */
const createGraph = () => {
  const ChatStateAnnotation = createAnnotations()
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

  return graph.compile()
}

/**
 * Execute workflow using LangGraph
 */
export const executeWorkflow = async (
  initialState: WorkflowState,
  recursionLimit: number = DEFAULT_RECURSION_LIMIT,
): Promise<WorkflowState> => {
  try {
    const compiled = createGraph()

    const result = await compiled.invoke(toLangGraphState(initialState), {
      recursionLimit,
    })

    return fromLangGraphResult(result)
  } catch (error) {
    console.error(WORKFLOW_ERROR_MESSAGES.LANGGRAPH_FAILED, error)

    // Even with LangGraph execution failure, go through finalResponseNode to ensure proper response
    const errorMessage =
      error instanceof Error
        ? error.message
        : WORKFLOW_ERROR_MESSAGES.EXECUTION_FAILED

    const errorState = createErrorState(initialState, errorMessage)
    return await finalResponseNode(errorState)
  }
}
