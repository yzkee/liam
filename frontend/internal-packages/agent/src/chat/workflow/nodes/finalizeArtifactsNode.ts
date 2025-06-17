import type { NodeLogger } from '../../../utils/nodeLogger'
import type { WorkflowState } from '../types'

/**
 * Finalize Artifacts Node - Generate & Save Artifacts
 * Performed by dbAgentArtifactGen
 */
export async function finalizeArtifactsNode(
  state: WorkflowState,
  log: NodeLogger = () => {},
): Promise<WorkflowState> {
  log({ node: 'finalizeArtifactsNode', state: 'start' })

  let finalResponse: string
  let errorToReturn: string | undefined

  // Handle different scenarios for final response
  if (state.error) {
    // If there's an error, create an error response for the user
    finalResponse = `Sorry, an error occurred during processing: ${state.error}`
    errorToReturn = state.error
  } else if (state.generatedAnswer) {
    // Normal case: use the generated answer
    finalResponse = state.generatedAnswer
    errorToReturn = undefined

    // Save AI message to database
    const saveResult = await state.repositories.schema.createMessage({
      designSessionId: state.designSessionId,
      content: finalResponse,
      role: 'assistant',
    })

    if (!saveResult.success) {
      console.error('Failed to save AI message:', saveResult.error)
      // Continue processing even if message saving fails
    }
  } else {
    // Fallback case: no generated answer and no specific error
    finalResponse = 'Sorry, we could not generate an answer. Please try again.'
    errorToReturn = 'No generated answer available'
  }

  // Update chat history with the new conversation
  const updatedHistory = [
    ...state.history,
    `User: ${state.userInput}`,
    `Assistant: ${finalResponse}`,
  ]

  log({ node: 'finalizeArtifactsNode', state: 'end' })

  return {
    ...state,
    finalResponse,
    history: updatedHistory,
    error: errorToReturn,
  }
}
