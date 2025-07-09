import type { RunnableConfig } from '@langchain/core/runnables'
import { ResultAsync } from 'neverthrow'
import type * as v from 'valibot'
import { PMAnalysisAgent } from '../../../langchain/agents'
import type { requirementsAnalysisSchema } from '../../../langchain/agents/pmAnalysisAgent/agent'
import type { BasePromptVariables } from '../../../langchain/utils/types'
import type { Repositories } from '../../../repositories'
import type { NodeLogger } from '../../../utils/nodeLogger'
import { getWorkflowNodeProgress } from '../shared/getWorkflowNodeProgress'
import type { WorkflowState } from '../types'

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
  const { repositories, logger } = config.configurable as {
    repositories: Repositories
    logger: NodeLogger
  }

  logger.log(`[${NODE_NAME}] Started`)

  // Update progress message if available
  if (state.progressTimelineItemId) {
    await repositories.schema.updateTimelineItem(state.progressTimelineItemId, {
      content: 'Processing: analyzeRequirements',
      progress: getWorkflowNodeProgress('analyzeRequirements'),
    })
  }

  const pmAnalysisAgent = new PMAnalysisAgent()

  const promptVariables: BasePromptVariables = {
    chat_history: state.formattedHistory,
    user_message: state.userInput,
  }

  const retryCount = state.retryCount[NODE_NAME] ?? 0

  const result = await ResultAsync.fromPromise(
    pmAnalysisAgent.analyzeRequirements(promptVariables),
    (error) => (error instanceof Error ? error : new Error(String(error))),
  )

  return result.match(
    (analysisResult) => {
      // Log the analysis result for debugging/monitoring purposes
      logAnalysisResult(logger, analysisResult)

      logger.log(`[${NODE_NAME}] Completed`)

      return {
        ...state,
        analyzedRequirements: {
          businessRequirement: analysisResult.businessRequirement,
          functionalRequirements: analysisResult.functionalRequirements,
          nonFunctionalRequirements: analysisResult.nonFunctionalRequirements,
        },
        error: undefined, // Clear error on success
      }
    },
    (error) => {
      logger.error(`[${NODE_NAME}] Failed: ${error.message}`)

      // Increment retry count and set error
      return {
        ...state,
        error: error,
        retryCount: {
          ...state.retryCount,
          [NODE_NAME]: retryCount + 1,
        },
      }
    },
  )
}
