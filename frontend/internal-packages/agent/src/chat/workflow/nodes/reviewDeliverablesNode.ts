import type { RunnableConfig } from '@langchain/core/runnables'
import type { Repositories } from '../../../repositories'
import type { NodeLogger } from '../../../utils/nodeLogger'
import { getWorkflowNodeProgress } from '../shared/getWorkflowNodeProgress'
import type { WorkflowState } from '../types'

const NODE_NAME = 'reviewDeliverablesNode'

/**
 * Review Deliverables Node - Final Requirements & Deliverables Confirmation
 * Performed by pmReviewAgent
 */
export async function reviewDeliverablesNode(
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
      content: 'Processing: reviewDeliverables',
      progress: getWorkflowNodeProgress('reviewDeliverables'),
    })
  }

  // TODO: Implement deliverables review logic
  // This node should perform final confirmation of requirements and deliverables

  logger.log(`[${NODE_NAME}] Completed`)

  // For now, pass through the state unchanged (assuming review passes)
  // Future implementation will review deliverables and confirm requirements
  return {
    ...state,
  }
}
