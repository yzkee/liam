import {
  answerGenerationNode,
  finalResponseNode,
  validationNode,
} from '../nodes'
import type { WorkflowState, WorkflowStepResult } from '../types'
import {
  createErrorState,
  createFallbackFinalState,
  mergeStates,
  prepareFinalState,
} from './stateManager'

/**
 * Execute validation step
 */
export const executeValidation = async (
  initialState: WorkflowState,
): Promise<WorkflowStepResult> => {
  const validationResult = await validationNode(initialState)

  if (validationResult.error) {
    const errorState = createErrorState(initialState, validationResult.error)
    const finalResult = await finalResponseNode(errorState, {
      streaming: false,
    })
    return { error: validationResult.error, finalState: finalResult }
  }

  return { state: mergeStates(initialState, validationResult) }
}

/**
 * Execute answer generation step
 */
export const executeAnswerGeneration = async (
  state: WorkflowState,
): Promise<WorkflowStepResult> => {
  const answerResult = await answerGenerationNode(state)

  if (answerResult.error) {
    const errorState = createErrorState(state, answerResult.error)
    const finalResult = await finalResponseNode(errorState, {
      streaming: false,
    })
    return { error: answerResult.error, finalState: finalResult }
  }

  return { state: mergeStates(state, answerResult) }
}

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

    // Use type guard from types.ts
    const { isWorkflowState } = await import('../types')

    return isWorkflowState(value)
      ? value
      : createFallbackFinalState(fallbackState)
  } catch (error) {
    console.error('Failed to extract final state from generator:', error)
    return createFallbackFinalState(fallbackState)
  }
}
