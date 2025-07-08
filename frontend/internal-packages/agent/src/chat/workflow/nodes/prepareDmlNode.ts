import type { RunnableConfig } from '@langchain/core/runnables'
import type { Repositories } from '../../../repositories'
import type { NodeLogger } from '../../../utils/nodeLogger'
import { getWorkflowNodeProgress } from '../shared/getWorkflowNodeProgress'
import type { WorkflowState } from '../types'

/**
 * Prepare DML Node - QA Agent generates DML
 * Performed by qaAgent
 */
export async function prepareDmlNode(
  state: WorkflowState,
  config: RunnableConfig,
): Promise<WorkflowState> {
  const { repositories } = config.configurable as {
    repositories: Repositories
    logger: NodeLogger
  }

  // Update progress message if available
  if (state.progressTimelineItemId) {
    await repositories.schema.updateTimelineItem(state.progressTimelineItemId, {
      content: 'Processing: prepareDML',
      progress: getWorkflowNodeProgress('prepareDML'),
    })
  }

  return {
    ...state,
  }
}
