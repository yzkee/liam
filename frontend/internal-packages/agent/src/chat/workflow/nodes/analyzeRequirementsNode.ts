import type { RunnableConfig } from '@langchain/core/runnables'
import type { Database } from '@liam-hq/db'
import { PMAnalysisAgent } from '../../../langchain/agents'
import { WorkflowTerminationError } from '../../../shared/errorHandling'
import { getConfigurable } from '../shared/getConfigurable'
import type { WorkflowState } from '../types'
import { logAssistantMessage } from '../utils/timelineLogger'

/**
 * Analyze Requirements Node - Requirements Organization
 * Performed by pmAnalysisAgent
 */
export async function analyzeRequirementsNode(
  state: WorkflowState,
  config: RunnableConfig,
): Promise<WorkflowState> {
  const assistantRole: Database['public']['Enums']['assistant_role_enum'] = 'pm'
  const configurableResult = getConfigurable(config)
  if (configurableResult.isErr()) {
    throw new WorkflowTerminationError(
      configurableResult.error,
      'analyzeRequirementsNode',
    )
  }
  const { repositories } = configurableResult.value

  await logAssistantMessage(
    state,
    repositories,
    'Breaking down your request into structured requirements...',
    assistantRole,
  )

  const pmAnalysisAgent = new PMAnalysisAgent()

  const analysisResult = await pmAnalysisAgent.generate(state.messages)

  return analysisResult.match(
    async (analysisData) => {
      // Log reasoning summary if available
      if (
        analysisData.reasoning?.summary &&
        analysisData.reasoning.summary.length > 0
      ) {
        for (const summaryItem of analysisData.reasoning.summary) {
          await logAssistantMessage(
            state,
            repositories,
            summaryItem.text,
            assistantRole,
          )
        }
      }

      // PMAnalysisAgent has already parsed the JSON response
      // Set analyzedRequirements so the conditional routing can proceed to saveRequirementToArtifact
      const analyzedRequirements = {
        businessRequirement: analysisData.response.businessRequirement,
        functionalRequirements: analysisData.response.functionalRequirements,
        nonFunctionalRequirements:
          analysisData.response.nonFunctionalRequirements,
      }

      return {
        ...state,
        analyzedRequirements,
      }
    },
    async (error) => {
      const currentRetryCount = state.retryCount['analyzeRequirements'] || 0
      const newRetryCount = currentRetryCount + 1

      await logAssistantMessage(
        state,
        repositories,
        `Having trouble understanding your requirements (attempt ${newRetryCount}): ${error.message}. Let me try a different approach...`,
        assistantRole,
      )

      // Instead of throwing, return state with incremented retry count
      // This allows conditional routing to decide whether to retry or fallback
      return {
        ...state,
        retryCount: {
          ...state.retryCount,
          analyzeRequirements: newRetryCount,
        },
        // Keep analyzedRequirements undefined so conditional routing works
        analyzedRequirements: undefined,
      }
    },
  )
}
