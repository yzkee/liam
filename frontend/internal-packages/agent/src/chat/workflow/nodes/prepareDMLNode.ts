import type { WorkflowState } from '../types'

/**
 * Prepare DML Node - QA Agent generates DML
 * Performed by qaAgent
 */
export async function prepareDMLNode(
  state: WorkflowState,
): Promise<WorkflowState> {
  return {
    ...state,
  }
}
