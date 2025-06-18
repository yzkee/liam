import type { WorkflowState } from '../types'

const NODE_NAME = 'validateSchemaNode'

/**
 * Validate Schema Node - DML Execution & Validation
 * Performed by qaAgent
 */
export async function validateSchemaNode(
  state: WorkflowState,
): Promise<WorkflowState> {
  state.logger.log(`[${NODE_NAME}] Started`)

  state.logger.log(`[${NODE_NAME}] Completed`)

  return {
    ...state,
  }
}
