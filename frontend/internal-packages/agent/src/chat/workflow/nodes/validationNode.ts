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

  return {
    ...state,
  }
}
