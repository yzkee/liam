import type { WorkflowState } from '../types'

/**
 * Final response node - creates the final response for the user
 */
export const finalResponseNode = async (
  state: WorkflowState,
): Promise<WorkflowState> => {
  try {
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
    } else {
      // Fallback case: no generated answer and no specific error
      finalResponse =
        'Sorry, we could not generate an answer. Please try again.'
      errorToReturn = 'No generated answer available'
    }

    // Update chat history with the new conversation
    const updatedHistory = [
      ...state.history,
      `User: ${state.userInput}`,
      `Assistant: ${finalResponse}`,
    ]

    return {
      ...state,
      finalResponse,
      history: updatedHistory,
      error: errorToReturn,
    }
  } catch (error) {
    // Fallback error handling
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to create final response'
    const fallbackResponse = `Sorry, a system error occurred: ${errorMessage}`

    return {
      ...state,
      finalResponse: fallbackResponse,
      history: [
        ...state.history,
        `User: ${state.userInput}`,
        `Assistant: ${fallbackResponse}`,
      ],
      error: errorMessage,
    }
  }
}
