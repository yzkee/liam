import {
  PROGRESS_MESSAGES,
  WORKFLOW_ERROR_MESSAGES,
} from '../constants/progressMessages'
import { finalResponseNode } from '../nodes'
import { createErrorState } from '../services/stateManager'
import {
  executeAnswerGeneration,
  executeValidation,
  extractFinalState,
  prepareFinalResponseGenerator,
} from '../services/workflowSteps'
import type { ResponseChunk, WorkflowState } from '../types'

/**
 * Execute streaming workflow
 */
export const executeStreamingWorkflow = async function* (
  initialState: WorkflowState,
): AsyncGenerator<ResponseChunk, WorkflowState, unknown> {
  try {
    // Step 1: Validation
    yield { type: 'custom', content: PROGRESS_MESSAGES.VALIDATION.START }
    const validationResult = await executeValidation(initialState)

    // Import type guard
    const { isWorkflowStepFailure } = await import('../types')

    if (isWorkflowStepFailure(validationResult)) {
      yield { type: 'custom', content: PROGRESS_MESSAGES.VALIDATION.ERROR }
      yield { type: 'error', content: validationResult.error }
      return validationResult.finalState
    }

    yield { type: 'custom', content: PROGRESS_MESSAGES.VALIDATION.SUCCESS }

    // Step 2: Answer Generation (preparation only)
    yield {
      type: 'custom',
      content: PROGRESS_MESSAGES.ANSWER_GENERATION.START,
    }
    const answerResult = await executeAnswerGeneration(validationResult.state)

    if (isWorkflowStepFailure(answerResult)) {
      yield {
        type: 'custom',
        content: PROGRESS_MESSAGES.ANSWER_GENERATION.ERROR,
      }
      yield { type: 'error', content: answerResult.error }
      return answerResult.finalState
    }

    // Step 3: Final Response (actual AI generation happens here)
    yield { type: 'custom', content: PROGRESS_MESSAGES.FINAL_RESPONSE.START }

    // Stream the final response
    const { finalState, generator } = prepareFinalResponseGenerator(
      answerResult.state,
      initialState,
    )

    let hasStreamedContent = false

    for await (const chunk of generator) {
      if (chunk.type === 'text' || chunk.type === 'error') {
        // Mark answer generation as complete when we start getting actual content
        if (!hasStreamedContent) {
          yield {
            type: 'custom',
            content: PROGRESS_MESSAGES.ANSWER_GENERATION.SUCCESS,
          }
          hasStreamedContent = true
        }
        yield chunk
      }
    }

    // Mark formatting as complete only after all streaming is done
    yield {
      type: 'custom',
      content: PROGRESS_MESSAGES.FINAL_RESPONSE.SUCCESS,
    }

    // Get final state from generator
    const finalResult = await extractFinalState(generator, finalState)
    return finalResult
  } catch (error) {
    console.error(WORKFLOW_ERROR_MESSAGES.LANGGRAPH_FAILED, error)

    const errorMessage =
      error instanceof Error
        ? error.message
        : WORKFLOW_ERROR_MESSAGES.EXECUTION_FAILED

    yield { type: 'error', content: errorMessage }

    // Even with catch error, go through finalResponseNode to ensure proper response
    const errorState = createErrorState(initialState, errorMessage)
    const finalResult = await finalResponseNode(errorState, {
      streaming: false,
    })
    return finalResult
  }
}
