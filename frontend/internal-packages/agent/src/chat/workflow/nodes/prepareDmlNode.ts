import type { RunnableConfig } from '@langchain/core/runnables'
import type { WorkflowState } from '../types'

/**
 * Prepare DML Node - QA Agent generates DML
 * Performed by qaAgent
 */
export async function prepareDmlNode(
  state: WorkflowState,
  config: RunnableConfig,
): Promise<WorkflowState> {
  return {
    ...state,
  }
}
