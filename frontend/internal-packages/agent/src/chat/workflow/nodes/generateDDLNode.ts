import type { WorkflowState } from '../types'

/**
 * Generate DDL Node - Agent generates DDL
 * Performed by agent
 */
export async function generateDDLNode(
  state: WorkflowState,
): Promise<WorkflowState> {
  return {
    ...state,
  }
}
