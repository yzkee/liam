import { AIMessage } from '@langchain/core/messages'
import type { RunnableConfig } from '@langchain/core/runnables'
import type { Database } from '@liam-hq/db'
import { ResultAsync } from 'neverthrow'
import { QAGenerateUsecaseAgent } from '../../../langchain/agents'
import { getConfigurable } from '../shared/getConfigurable'
import type { WorkflowState } from '../types'
import { logAssistantMessage } from '../utils/timelineLogger'
import { withTimelineItemSync } from '../utils/withTimelineItemSync'

/**
 * Generate Usecase Node - QA Agent creates use cases
 * Performed by qaGenerateUsecaseAgent
 */
export async function generateUsecaseNode(
  state: WorkflowState,
  config: RunnableConfig,
): Promise<WorkflowState> {
  const assistantRole: Database['public']['Enums']['assistant_role_enum'] = 'qa'
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
    'Creating test scenarios to validate your database design...',
    assistantRole,
  )

  // Check if we have analyzed requirements
  if (!state.analyzedRequirements) {
    const errorMessage =
      'No analyzed requirements found. Cannot generate use cases.'

    await logAssistantMessage(
      state,
      repositories,
      'Unable to generate test scenarios. This might be due to unclear requirements...',
      assistantRole,
    )

    return {
      ...state,
      error: new Error(errorMessage),
    }
  }

  const qaAgent = new QAGenerateUsecaseAgent()

  const retryCount = state.retryCount['generateUsecaseNode'] ?? 0

  // Use state.messages directly - includes error messages and all context
  const usecaseResult = await ResultAsync.fromPromise(
    qaAgent.generate(state.messages),
    (error) => (error instanceof Error ? error : new Error(String(error))),
  )

  return await usecaseResult.match(
    async (generatedResult) => {
      const usecaseMessage = await withTimelineItemSync(
        new AIMessage({
          content: `Generated ${generatedResult.usecases.length} use cases for testing and validation`,
          name: 'QAGenerateUsecaseAgent',
        }),
        {
          designSessionId: state.designSessionId,
          organizationId: state.organizationId || '',
          userId: state.userId,
          repositories,
          assistantRole,
        },
      )

      return {
        ...state,
        messages: [...state.messages, usecaseMessage],
        generatedUsecases: generatedResult.usecases,
        error: undefined, // Clear error on success
      }
    },
    async (error) => {
      await logAssistantMessage(
        state,
        repositories,
        'Unable to generate test scenarios. This might be due to unclear requirements...',
        assistantRole,
      )

      // Increment retry count and set error
      return {
        ...state,
        error: error,
        retryCount: {
          ...state.retryCount,
          ['generateUsecaseNode']: retryCount + 1,
        },
      }
    },
  )
}
