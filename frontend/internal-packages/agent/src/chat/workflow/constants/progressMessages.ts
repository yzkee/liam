/**
 * Progress messages for workflow steps
 */
export const PROGRESS_MESSAGES = {
  VALIDATION: {
    START: '🔍 Checking your input... 🔄',
    SUCCESS: '🔍 Checking your input... ✅',
    ERROR: '🔍 Checking your input... ❌',
  },
  ANSWER_GENERATION: {
    START: '💬 Generating an answer... 🔄',
    SUCCESS: '💬 Generating an answer... ✅',
    ERROR: '💬 Generating an answer... ❌',
  },
  FINAL_RESPONSE: {
    START: '📦 Formatting the final response... 🔄',
    SUCCESS: '📦 Formatting the final response... ✅',
    ERROR: '📦 Formatting the final response... ❌',
  },
} as const

/**
 * Default error messages for workflow
 */
export const WORKFLOW_ERROR_MESSAGES = {
  EXECUTION_FAILED: 'Workflow execution failed',
  ANSWER_GENERATION_FAILED: 'Failed to generate answer',
  LANGGRAPH_FAILED: 'LangGraph execution failed, falling back to error state',
} as const
