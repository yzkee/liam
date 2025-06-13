import type { WorkflowState } from '../types'

export const validationNode = async (
  state: WorkflowState,
): Promise<WorkflowState> => {
  if (!state.schemaData) {
    return {
      ...state,
      error: 'Schema data is required for answer generation',
    }
  }

  // Format chat history for prompt
  const formattedChatHistory =
    state.history && state.history.length > 0
      ? state.history.join('\n')
      : 'No previous conversation.'

  return {
    ...state,
    formattedChatHistory,
  }
}
