import { Command, END } from '@langchain/langgraph'
import type { WorkflowConfigurable } from '../chat/workflow/types'

/**
 * Handle immediate error recording and workflow stopping
 * This creates a timeline item immediately and stops the workflow using Command pattern
 */
export const handleImmediateError = async (
  error: Error,
  context: {
    nodeId: string
    designSessionId: string
    workflowRunId: string
    repositories: WorkflowConfigurable['repositories']
  },
): Promise<Command> => {
  const { nodeId, designSessionId, workflowRunId, repositories } = context

  await repositories.schema.createTimelineItem({
    designSessionId,
    content: `Error in ${nodeId}: ${error.message}`,
    type: 'error',
  })

  // Update workflow run status to error
  await repositories.schema.updateWorkflowRunStatus({
    workflowRunId,
    status: 'error',
  })

  return new Command({
    update: {},
    goto: END,
  })
}

/**
 * Handle configuration errors when repositories are not available
 * This is a fallback for cases where we can't access repositories.
 *
 * Note: We cannot call handleImmediateError here because configuration errors
 * typically mean that repositories is missing from the config, so we cannot
 * save timeline items to the database. We log to console instead for debugging.
 */
export const handleConfigurationError = async (
  error: Error,
  context: {
    nodeId: string
    designSessionId?: string
  },
): Promise<Command> => {
  const { nodeId, designSessionId } = context

  // Log the configuration error to console for debugging
  // Cannot save to timeline_items because repositories is not available
  console.error(`Configuration error in ${nodeId}: ${error.message}`, {
    designSessionId,
    error,
  })

  return new Command({
    update: {},
    goto: END,
  })
}
