import type { WorkflowState } from '../types'

/**
 * Merge workflow states with proper fallbacks
 */
export const mergeStates = (
  baseState: WorkflowState,
  updates: Partial<WorkflowState>,
): WorkflowState => {
  return {
    ...baseState,
    ...updates,
    // Ensure arrays are properly handled
    history: updates.history || baseState.history || [],
  }
}

/**
 * Prepare final state for streaming
 */
export const prepareFinalState = (
  currentState: WorkflowState,
  initialState: WorkflowState,
): WorkflowState => {
  return {
    mode: currentState.mode || initialState.mode,
    userInput: currentState.userInput || initialState.userInput,
    history: currentState.history || initialState.history || [],
    schemaData: currentState.schemaData || initialState.schemaData,
    projectId: currentState.projectId || initialState.projectId,
    generatedAnswer: currentState.generatedAnswer,
    finalResponse: currentState.finalResponse,
    error: currentState.error,
    // Include processed fields
    schemaText: currentState.schemaText,
    formattedChatHistory: currentState.formattedChatHistory,
    agentName: currentState.agentName,
  }
}

/**
 * Create error state with proper fallbacks
 */
export const createErrorState = (
  baseState: WorkflowState,
  errorMessage: string,
): WorkflowState => {
  return {
    ...baseState,
    error: errorMessage,
  }
}

/**
 * Create fallback final state when generator fails
 */
export const createFallbackFinalState = (
  finalState: WorkflowState,
): WorkflowState => {
  const response = finalState.generatedAnswer || 'No response generated'

  return {
    ...finalState,
    finalResponse: response,
    history: [
      ...finalState.history,
      `User: ${finalState.userInput}`,
      `Assistant: ${response}`,
    ],
  }
}

/**
 * Convert WorkflowState to LangGraph compatible format
 */
export const toLangGraphState = (state: WorkflowState) => {
  return {
    mode: state.mode,
    userInput: state.userInput,
    generatedAnswer: state.generatedAnswer,
    finalResponse: state.finalResponse,
    history: state.history || [],
    schemaData: state.schemaData,
    projectId: state.projectId,
    error: state.error,
    schemaText: state.schemaText,
    formattedChatHistory: state.formattedChatHistory,
    agentName: state.agentName,
  }
}

/**
 * Convert LangGraph result back to WorkflowState
 */
export const fromLangGraphResult = (
  result: Record<string, unknown>,
): WorkflowState => {
  return {
    mode: result.mode as WorkflowState['mode'],
    userInput: result.userInput as string,
    generatedAnswer: result.generatedAnswer as string | undefined,
    finalResponse: result.finalResponse as string | undefined,
    history: (result.history as string[]) || [],
    schemaData: result.schemaData as WorkflowState['schemaData'],
    projectId: result.projectId as string | undefined,
    error: result.error as string | undefined,
    schemaText: result.schemaText as string | undefined,
    formattedChatHistory: result.formattedChatHistory as string | undefined,
    agentName: result.agentName as WorkflowState['agentName'],
  }
}
