import type { RunnableConfig } from '@langchain/core/runnables'
import { ResultAsync } from 'neverthrow'
import { PMAnalysisAgent } from '../../../langchain/agents'
import type { BasePromptVariables } from '../../../langchain/utils/types'
import { getConfigurable } from '../shared/getConfigurable'
import type { WorkflowState } from '../types'
import {
  createRequirementsAnalysisMessage,
  TIMELINE_MESSAGES,
} from '../utils/messageFormatters'
import { formatMessagesToHistory } from '../utils/messageUtils'
import { logAssistantMessage } from '../utils/timelineLogger'

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
  const { repositories } = configurableResult.value

  await logAssistantMessage(
    state,
    repositories,
    TIMELINE_MESSAGES.REQUIREMENTS_ANALYSIS.START,
  )

  const pmAnalysisAgent = new PMAnalysisAgent()

  const promptVariables: BasePromptVariables = {
    chat_history: formatMessagesToHistory(state.messages),
    user_message: state.userInput,
  }

  const retryCount = state.retryCount['analyzeRequirementsNode'] ?? 0

  await logAssistantMessage(
    state,
    repositories,
    TIMELINE_MESSAGES.REQUIREMENTS_ANALYSIS.ORGANIZING,
  )

  const analysisResult = await ResultAsync.fromPromise(
    pmAnalysisAgent.analyzeRequirements(promptVariables),
    (error) => (error instanceof Error ? error : new Error(String(error))),
  )

  return analysisResult.match(
    async (result) => {
      await logAssistantMessage(
        state,
        repositories,
        TIMELINE_MESSAGES.REQUIREMENTS_ANALYSIS.COMPLETED,
      )

      return {
        ...state,
        messages: [
          ...state.messages,
          createRequirementsAnalysisMessage(result.businessRequirement),
        ],
        analyzedRequirements: {
          businessRequirement: result.businessRequirement,
          functionalRequirements: result.functionalRequirements,
          nonFunctionalRequirements: result.nonFunctionalRequirements,
        },
        error: undefined, // Clear error on success
      }
    },
    async (error) => {
      await logAssistantMessage(
        state,
        repositories,
        TIMELINE_MESSAGES.REQUIREMENTS_ANALYSIS.ERROR,
      )

      return {
        ...state,
        error,
        retryCount: {
          ...state.retryCount,
          ['analyzeRequirementsNode']: retryCount + 1,
        },
      }
    },
  )
}
