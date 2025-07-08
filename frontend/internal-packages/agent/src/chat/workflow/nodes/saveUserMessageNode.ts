import type { RunnableConfig } from '@langchain/core/runnables'
import type { Repositories } from '../../../repositories'
import type { NodeLogger } from '../../../utils/nodeLogger'
import type { WorkflowState } from '../types'

const NODE_NAME = 'saveUserMessageNode'

/**
 * Save User Message Node - Saves the user's message to the database
 * This is the first node in the workflow to ensure message persistence
 */
export async function saveUserMessageNode(
  state: WorkflowState,
  config: RunnableConfig,
): Promise<WorkflowState> {
  const { repositories, logger } = config.configurable as {
    repositories: Repositories
    logger: NodeLogger
  }

  logger.log(`[${NODE_NAME}] Started`)

  // Save user message to database
  const saveResult = await repositories.schema.createTimelineItem({
    designSessionId: state.designSessionId,
    content: state.userInput,
    type: 'user',
    userId: state.userId,
  })

  if (!saveResult.success) {
    logger.error(`[${NODE_NAME}] Failed to save user message:`, {
      error: saveResult.error,
    })
    // Set error state to trigger transition to finalizeArtifacts
    const error = new Error(`Failed to save message: ${saveResult.error}`)
    return {
      ...state,
      error,
    }
  }

  logger.log(`[${NODE_NAME}] Successfully saved user message`)

  return state
}
