import type { RunnableConfig } from '@langchain/core/runnables'
import type { Repositories } from '../../../repositories'
import type { NodeLogger } from '../../../utils/nodeLogger'
import type { WorkflowState } from '../types'

const NODE_NAME = 'createProgressMessageNode'

/**
 * Create Progress Message Node - Creates initial progress timeline item
 * This node runs after saveUserMessageNode to ensure proper message ordering
 */
export async function createProgressMessageNode(
  state: WorkflowState,
  config: RunnableConfig,
): Promise<WorkflowState> {
  const { repositories, logger } = config.configurable as {
    repositories: Repositories
    logger: NodeLogger
  }

  logger.log(`[${NODE_NAME}] Started`, {
    timestamp: new Date().toISOString(),
    designSessionId: state.designSessionId,
  })

  // Create initial progress timeline item
  const progressResult = await repositories.schema.createTimelineItem({
    content: 'Starting job...',
    type: 'progress',
    designSessionId: state.designSessionId,
    progress: 0,
  })

  if (!progressResult.success) {
    logger.warn(`[${NODE_NAME}] Failed to create progress timeline item:`, {
      error: progressResult.error,
    })
    // Don't fail the workflow for progress item creation failure
    // Just log and continue
    return state
  }

  logger.log(`[${NODE_NAME}] Successfully created progress timeline item`, {
    timestamp: new Date().toISOString(),
    progressTimelineItemId: progressResult.timelineItem.id,
  })

  // Store progress timeline item ID in state for future updates
  return {
    ...state,
    progressTimelineItemId: progressResult.timelineItem.id,
  }
}
