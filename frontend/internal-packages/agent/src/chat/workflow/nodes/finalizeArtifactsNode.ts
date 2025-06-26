import type { WorkflowState } from '../types'
import {
  createOrUpdateArtifact,
  transformWorkflowStateToArtifact,
} from '../utils/transformWorkflowStateToArtifact'

const NODE_NAME = 'finalizeArtifactsNode'

/**
 * Finalize Artifacts Node - Generate & Save Artifacts
 * Performed by dbAgentArtifactGen
 */
export async function finalizeArtifactsNode(
  state: WorkflowState,
): Promise<WorkflowState> {
  state.logger.log(`[${NODE_NAME}] Started`)

  // Save artifacts if we have the necessary data
  if (state.analyzedRequirements || state.generatedUsecases) {
    state.logger.log(`[${NODE_NAME}] Saving artifacts`)

    const artifact = transformWorkflowStateToArtifact(state)
    const artifactResult = await createOrUpdateArtifact(state, artifact)

    if (artifactResult.success) {
      state.logger.log(`[${NODE_NAME}] Artifacts saved successfully`)
    } else {
      state.logger.log(
        `[${NODE_NAME}] Failed to save artifacts: ${artifactResult.error}`,
      )
      // Continue processing even if artifact saving fails
    }
  } else {
    state.logger.log(`[${NODE_NAME}] No artifact data available to save`)
  }

  let finalResponse: string
  let errorToReturn: string | undefined

  // Handle different scenarios for final response
  if (state.error) {
    // If there's an error, create an error response for the user
    finalResponse = `Sorry, an error occurred during processing: ${state.error}`
    errorToReturn = state.error

    // Save error timeline item to database
    const saveResult = await state.repositories.schema.createTimelineItem({
      designSessionId: state.designSessionId,
      content: finalResponse,
      type: 'error',
    })

    if (!saveResult.success) {
      console.error('Failed to save error message:', saveResult.error)
      // Continue processing even if message saving fails
    }
  } else if (state.generatedAnswer) {
    // Normal case: use the generated answer
    finalResponse = state.generatedAnswer
    errorToReturn = undefined

    // Save AI timeline item to database
    const saveResult = await state.repositories.schema.createTimelineItem({
      designSessionId: state.designSessionId,
      content: finalResponse,
      type: 'assistant',
    })

    if (!saveResult.success) {
      console.error('Failed to save AI timeline item:', saveResult.error)
      // Continue processing even if timeline item saving fails
    }
  } else {
    // Fallback case: no generated answer and no specific error
    finalResponse = 'Sorry, we could not generate an answer. Please try again.'
    errorToReturn = 'No generated answer available'

    // Save fallback timeline item to database
    const saveResult = await state.repositories.schema.createTimelineItem({
      designSessionId: state.designSessionId,
      content: finalResponse,
      type: 'error',
    })

    if (!saveResult.success) {
      console.error('Failed to save fallback message:', saveResult.error)
      // Continue processing even if message saving fails
    }
  }

  state.logger.log(`[${NODE_NAME}] Completed`)

  return {
    ...state,
    finalResponse,
    error: errorToReturn,
  }
}
