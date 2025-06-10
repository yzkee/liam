import { finalResponseNode } from '../nodes'
import {
  createFallbackFinalState,
  prepareFinalState,
} from '../shared/stateManager'
import type { WorkflowState } from '../types'
import { isWorkflowState } from '../types'

/**
 * Prepare final response generator
 */
export const prepareFinalResponseGenerator = (
  state: WorkflowState,
  initialState: WorkflowState,
) => {
  const finalState = prepareFinalState(state, initialState)
  const generator = finalResponseNode(finalState)
  return { finalState, generator }
}

/**
 * Extract final state from generator
 */
export const extractFinalState = async (
  generator: AsyncGenerator<unknown, WorkflowState, unknown>,
  fallbackState: WorkflowState,
): Promise<WorkflowState> => {
  try {
    const generatorResult = await generator.next()
    const value = generatorResult.value

    return isWorkflowState(value)
      ? value
      : createFallbackFinalState(fallbackState)
  } catch (error) {
    console.error('Failed to extract final state from generator:', error)
    return createFallbackFinalState(fallbackState)
  }
}
