import type { RunnableConfig } from '@langchain/core/runnables'
import { ResultAsync } from 'neverthrow'
import { QAGenerateUsecaseAgent } from '../../../langchain/agents'
import type { Usecase } from '../../../langchain/agents/qaGenerateUsecaseAgent/agent'
import type { BasePromptVariables } from '../../../langchain/utils/types'
import type { NodeLogger } from '../../../utils/nodeLogger'
import { getConfigurable } from '../shared/getConfigurable'
import { getWorkflowNodeProgress } from '../shared/getWorkflowNodeProgress'
import type { WorkflowState } from '../types'

const NODE_NAME = 'generateUsecaseNode'

/**
 * Log usecase generation results for debugging/monitoring purposes
 * TODO: Remove this function once the feature is stable and monitoring is no longer needed
 */
const logUsecaseResults = (logger: NodeLogger, usecases: Usecase[]): void => {
  logger.log(`[${NODE_NAME}] Generated ${usecases.length} use cases`)

  usecases.forEach((usecase, index) => {
    logger.log(
      `[${NODE_NAME}] Usecase ${index + 1} (${usecase.requirementType}): ${JSON.stringify(usecase)}`,
    )
  })
}

/**
 * Format analyzed requirements into a structured text for AI processing
 */
function formatAnalyzedRequirements(
  analyzedRequirements: NonNullable<WorkflowState['analyzedRequirements']>,
  userInput: string,
): string {
  return `
Business Requirement: ${analyzedRequirements.businessRequirement}

Functional Requirements:
${Object.entries(analyzedRequirements.functionalRequirements)
  .map(
    ([category, requirements]) =>
      `${category}:\n${requirements.map((req) => `- ${req}`).join('\n')}`,
  )
  .join('\n\n')}

Non-Functional Requirements:
${Object.entries(analyzedRequirements.nonFunctionalRequirements)
  .map(
    ([category, requirements]) =>
      `${category}:\n${requirements.map((req) => `- ${req}`).join('\n')}`,
  )
  .join('\n\n')}

Original User Input: ${userInput}
`
}

/**
 * Generate Usecase Node - QA Agent creates use cases
 * Performed by qaGenerateUsecaseAgent
 */
export async function generateUsecaseNode(
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

  // Update progress message if available
  if (state.progressTimelineItemId) {
    await repositories.schema.updateTimelineItem(state.progressTimelineItemId, {
      content: 'Processing: generateUsecase',
      progress: getWorkflowNodeProgress('generateUsecase'),
    })
  }

  // Check if we have analyzed requirements
  if (!state.analyzedRequirements) {
    const errorMessage =
      'No analyzed requirements found. Cannot generate use cases.'
    logger.error(`[${NODE_NAME}] ${errorMessage}`)
    return {
      ...state,
      error: new Error(errorMessage),
    }
  }

  const qaAgent = new QAGenerateUsecaseAgent()

  // Create a user message that includes the analyzed requirements
  const requirementsText = formatAnalyzedRequirements(
    state.analyzedRequirements,
    state.userInput,
  )

  const promptVariables: BasePromptVariables = {
    chat_history: state.formattedHistory,
    user_message: requirementsText,
  }

  const retryCount = state.retryCount[NODE_NAME] ?? 0

  const result = await ResultAsync.fromPromise(
    qaAgent.generate(promptVariables),
    (error) => (error instanceof Error ? error : new Error(String(error))),
  )

  return result.match(
    (generatedResult) => {
      // Log the usecase results for debugging/monitoring purposes
      logUsecaseResults(logger, generatedResult.usecases)

      logger.log(`[${NODE_NAME}] Completed`)

      return {
        ...state,
        generatedUsecases: generatedResult.usecases,
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
