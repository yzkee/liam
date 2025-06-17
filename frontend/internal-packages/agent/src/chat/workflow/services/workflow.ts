import { END, START, StateGraph } from '@langchain/langgraph'
import type { NodeLogger } from '../../../utils/nodeLogger'
import { WORKFLOW_ERROR_MESSAGES } from '../constants/progressMessages'
import {
  analyzeRequirementsNode,
  designSchemaNode,
  finalizeArtifactsNode,
  reviewDeliverablesNode,
  validateSchemaNode,
} from '../nodes'
import {
  DEFAULT_RECURSION_LIMIT,
  createAnnotations,
} from '../shared/langGraphUtils'
import type { WorkflowState } from '../types'

/**
 * Create and configure the LangGraph workflow
 */
const createGraph = (log: NodeLogger = () => {}) => {
  const ChatStateAnnotation = createAnnotations()
  const graph = new StateGraph(ChatStateAnnotation)

  graph
    .addNode('analyzeRequirements', (state) =>
      analyzeRequirementsNode(state, log),
    )
    .addNode('designSchema', (state) => designSchemaNode(state, log))
    .addNode('validateSchema', (state) => validateSchemaNode(state, log))
    .addNode('reviewDeliverables', (state) =>
      reviewDeliverablesNode(state, log),
    )
    .addNode('finalizeArtifacts', (state) => finalizeArtifactsNode(state, log))

    .addEdge(START, 'analyzeRequirements')
    .addEdge('analyzeRequirements', 'designSchema')
    .addEdge('designSchema', 'validateSchema')
    .addEdge('finalizeArtifacts', END)

    // Conditional edges for validation results
    .addConditionalEdges('validateSchema', (state) => {
      // success → reviewDeliverables
      // dml error or test fail → designSchema
      return state.error ? 'designSchema' : 'reviewDeliverables'
    })

    // Conditional edges for review results
    .addConditionalEdges('reviewDeliverables', (state) => {
      // OK → finalizeArtifacts
      // NG or issues found → analyzeRequirements
      return state.error ? 'analyzeRequirements' : 'finalizeArtifacts'
    })

  return graph.compile()
}

/**
 * Execute workflow using LangGraph
 */
export const executeWorkflow = async (
  initialState: WorkflowState,
  recursionLimit: number = DEFAULT_RECURSION_LIMIT,
  log: NodeLogger = () => {},
): Promise<WorkflowState> => {
  try {
    const compiled = createGraph(log)

    const result = await compiled.invoke(initialState, {
      recursionLimit,
    })

    return result
  } catch (error) {
    console.error(WORKFLOW_ERROR_MESSAGES.LANGGRAPH_FAILED, error)

    // Even with LangGraph execution failure, go through finalizeArtifactsNode to ensure proper response
    const errorMessage =
      error instanceof Error
        ? error.message
        : WORKFLOW_ERROR_MESSAGES.EXECUTION_FAILED

    const errorState = { ...initialState, error: errorMessage }
    return await finalizeArtifactsNode(errorState)
  }
}
