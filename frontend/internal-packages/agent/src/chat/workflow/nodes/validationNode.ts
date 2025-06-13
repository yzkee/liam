import { convertSchemaToText } from '../../../utils/convertSchemaToText'
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

  // Convert schema to text
  const schemaText = convertSchemaToText(state.schemaData)

  // Format chat history for prompt
  const formattedChatHistory =
    state.history && state.history.length > 0
      ? state.history.join('\n')
      : 'No previous conversation.'

  return {
    ...state,
    schemaText,
    formattedChatHistory,
  }
}
