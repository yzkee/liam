import type { RunnableConfig } from '@langchain/core/runnables'
import { ResultAsync } from 'neverthrow'
import type * as v from 'valibot'
import { PMAnalysisAgent } from '../../../langchain/agents'
import type { requirementsAnalysisSchema } from '../../../langchain/agents/pmAnalysisAgent/agent'
import type { BasePromptVariables } from '../../../langchain/utils/types'
import type { NodeLogger } from '../../../utils/nodeLogger'
import { getConfigurable } from '../shared/getConfigurable'
import type { WorkflowState } from '../types'
import { logAssistantMessage } from '../utils/timelineLogger'

const NODE_NAME = 'analyzeRequirementsNode'

type AnalysisResult = v.InferOutput<typeof requirementsAnalysisSchema>

/**
 * Log analysis results for debugging/monitoring purposes
 * TODO: Remove this function once the feature is stable and monitoring is no longer needed
 */
const logAnalysisResult = (
  logger: NodeLogger,
  result: AnalysisResult,
): void => {
  logger.log(`[${NODE_NAME}] Analysis Result:`)
  logger.log(`[${NODE_NAME}] BRD: ${result.businessRequirement}`)
  logger.log(
    `[${NODE_NAME}] Functional Requirements: ${JSON.stringify(result.functionalRequirements)}`,
  )
  logger.log(
    `[${NODE_NAME}] Non-Functional Requirements: ${JSON.stringify(result.nonFunctionalRequirements)}`,
  )
}

/**
 * Analyze Requirements Node - Requirements Organization
 * Performed by pmAnalysisAgent
 */
export async function analyzeRequirementsNode(
  state: WorkflowState,
  config: RunnableConfig,
): Promise<WorkflowState> {
  const configurableResult = getConfigurable(config)
  if (configurableResult.isErr()) {
    return {
      ...state,
      error: configurableResult.error,
    }
  }
  const { repositories, logger } = configurableResult.value

  logger.log(`[${NODE_NAME}] Started`)

  await logAssistantMessage(state, repositories, 'Analyzing requirements...')

  const pmAnalysisAgent = new PMAnalysisAgent()

  const promptVariables: BasePromptVariables = {
    chat_history: state.formattedHistory,
    user_message: state.userInput,
  }

  const retryCount = state.retryCount[NODE_NAME] ?? 0

  await logAssistantMessage(
    state,
    repositories,
    'Organizing business and functional requirements...',
  )

  const analysisResult = await ResultAsync.fromPromise(
    pmAnalysisAgent.analyzeRequirements(promptVariables),
    (error) => (error instanceof Error ? error : new Error(String(error))),
  )

  return analysisResult.match(
    async (result) => {
      // Log the analysis result for debugging/monitoring purposes
      logAnalysisResult(logger, result)

      await logAssistantMessage(
        state,
        repositories,
        'Requirements analysis completed',
      )

      logger.log(`[${NODE_NAME}] Completed`)

      return {
        ...state,
        analyzedRequirements: {
          businessRequirement: result.businessRequirement,
          functionalRequirements: result.functionalRequirements,
          nonFunctionalRequirements: result.nonFunctionalRequirements,
        },
        error: undefined, // Clear error on success
      }
    },
    async (error) => {
      logger.error(`[${NODE_NAME}] Failed: ${error.message}`)

      await logAssistantMessage(
        state,
        repositories,
        'Error occurred during requirements analysis',
      )

      return {
        ...state,
        error,
        retryCount: {
          ...state.retryCount,
          [NODE_NAME]: retryCount + 1,
        },
      }
    },
  )
}
