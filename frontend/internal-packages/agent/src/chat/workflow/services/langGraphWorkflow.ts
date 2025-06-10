import { Annotation, END, START, StateGraph } from '@langchain/langgraph'
import type { Schema } from '@liam-hq/db-structure'
import { WORKFLOW_ERROR_MESSAGES } from '../constants/progressMessages'
import {
  answerGenerationNode,
  finalResponseNode,
  validationNode,
} from '../nodes'
import type { AgentName, WorkflowState } from '../types'
import {
  createErrorState,
  fromLangGraphResult,
  toLangGraphState,
} from './stateManager'

/**
 * ChatState definition for LangGraph
 */
interface ChatState {
  userInput: string
  generatedAnswer?: string | undefined
  finalResponse?: string | undefined
  history: string[]
  schemaData?: Schema | undefined
  projectId?: string | undefined
  buildingSchemaId?: string | undefined
  latestVersionNumber?: number | undefined
  organizationId?: string | undefined
  userId?: string | undefined
  error?: string | undefined

  // Intermediate data for workflow
  schemaText?: string | undefined
  formattedChatHistory?: string | undefined
  agentName?: AgentName | undefined
}

const DEFAULT_RECURSION_LIMIT = 10

/**
 * Create LangGraph-compatible annotations
 */
const createAnnotations = () => {
  return Annotation.Root({
    userInput: Annotation<string>,
    generatedAnswer: Annotation<string | undefined>,
    finalResponse: Annotation<string | undefined>,
    history: Annotation<string[]>,
    schemaData: Annotation<Schema | undefined>,
    projectId: Annotation<string | undefined>,
    buildingSchemaId: Annotation<string | undefined>,
    latestVersionNumber: Annotation<number | undefined>,
    organizationId: Annotation<string | undefined>,
    userId: Annotation<string | undefined>,
    error: Annotation<string | undefined>,

    // Additional fields for workflow processing
    schemaText: Annotation<string | undefined>,
    formattedChatHistory: Annotation<string | undefined>,
    agentName: Annotation<AgentName | undefined>,
  })
}

/**
 * Wrap validationNode to match LangGraph node format
 */
const validateInput = async (state: ChatState): Promise<Partial<ChatState>> => {
  return validationNode(state)
}

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
      error:
        e instanceof Error
          ? e.message
          : WORKFLOW_ERROR_MESSAGES.ANSWER_GENERATION_FAILED,
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
 * Execute non-streaming workflow using LangGraph
 */
const executeLangGraphWorkflow = async (
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
    return await finalResponseNode(errorState, { streaming: false })
  }
}

// Export for backward compatibility
export { executeLangGraphWorkflow as LangGraphWorkflow }
