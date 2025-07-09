import type { RunnableConfig } from '@langchain/core/runnables'
import { getConfigurable } from '../shared/getConfigurable'
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
  const configurableResult = getConfigurable(config)
  if (configurableResult.isErr()) {
    return {
      ...state,
      error: configurableResult.error,
    }
  }
  const { repositories } = configurableResult.value

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
