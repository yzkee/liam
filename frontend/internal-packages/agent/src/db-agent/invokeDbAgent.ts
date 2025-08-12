import { DEFAULT_RECURSION_LIMIT } from '../chat/workflow/shared/langGraphUtils'
import type { WorkflowConfigurable } from '../chat/workflow/types'
import {
  executeWorkflowWithTracking,
  setupWorkflowState,
} from '../shared/workflowSetup'
import type { AgentWorkflowParams, AgentWorkflowResult } from '../types'
import { createDbAgentGraph } from './createDbAgentGraph'

/**
 * Invoke the DB Agent with provided parameters and repositories
 * This function encapsulates the logic for creating and invoking the DB agent graph
 * with proper workflow setup, tracking, and error handling
 */
export const invokeDbAgent = (
  params: AgentWorkflowParams,
  config: {
    configurable: WorkflowConfigurable
  },
): AgentWorkflowResult => {
  const { recursionLimit = DEFAULT_RECURSION_LIMIT } = params
  const compiled = createDbAgentGraph()

  // Setup workflow state with message conversion and timeline sync
  return setupWorkflowState(params, config).andThen((setup) =>
    executeWorkflowWithTracking(compiled, setup, recursionLimit),
  )
}
