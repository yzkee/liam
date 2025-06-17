import type { NodeLogger } from '../../utils/nodeLogger'
import { executeWorkflow } from './services/workflow'
import { DEFAULT_RECURSION_LIMIT } from './shared/langGraphUtils'
import type { WorkflowOptions, WorkflowState } from './types'
export const executeChatWorkflow = async (
  initialState: WorkflowState,
  options?: WorkflowOptions,
  log: NodeLogger = () => {},
): Promise<WorkflowState> => {
  const recursionLimit = options?.recursionLimit ?? DEFAULT_RECURSION_LIMIT
  return executeWorkflow(initialState, recursionLimit, log)
}
