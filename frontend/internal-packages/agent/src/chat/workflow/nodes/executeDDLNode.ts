import type { WorkflowState } from '../types'

/**
 * Execute DDL Node - Agent executes DDL
 * Performed by agent
 */
export async function executeDDLNode(
  state: WorkflowState,
): Promise<WorkflowState> {
  return {
    ...state,
  }
}
