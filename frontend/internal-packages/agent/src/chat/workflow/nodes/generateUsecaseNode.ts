import type { WorkflowState } from '../types'

/**
 * Generate Usecase Node - QA Agent creates use cases
 * Performed by qaAgent
 */
export async function generateUsecaseNode(
  state: WorkflowState,
): Promise<WorkflowState> {
  return {
    ...state,
  }
}
