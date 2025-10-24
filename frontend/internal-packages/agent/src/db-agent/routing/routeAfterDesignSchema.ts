import { END } from '@langchain/langgraph'
import { WorkflowTerminationError } from '../../utils/errorHandling'
import { hasToolCalls } from '../../utils/hasToolCalls'
import type { DbAgentState } from '../shared/dbAgentAnnotation'

const MAX_DESIGN_RETRY_COUNT = 3

/**
 * Determines the next node based on whether the last message contains tool calls
 * and handles retry logic for failed schema design attempts
 *
 * This routing function follows the ReAct pattern where the agent returns to
 * this decision point after each tool execution, allowing for multi-step schema design.
 */
export const routeAfterDesignSchema = (
  state: DbAgentState,
): 'invokeSchemaDesignTool' | 'designSchema' | typeof END => {
  const { messages, designSchemaRetryCount } = state
  const lastMessage = messages[messages.length - 1]

  // If last message has tool calls, execute them
  if (lastMessage && hasToolCalls(lastMessage)) {
    return 'invokeSchemaDesignTool'
  }

  // No tool calls present - AI has decided schema design is complete
  // Check if retry limit exceeded (safety check)
  if (designSchemaRetryCount >= MAX_DESIGN_RETRY_COUNT) {
    throw new WorkflowTerminationError(
      new Error(
        `Failed to design schema with tool usage after ${MAX_DESIGN_RETRY_COUNT} attempts`,
      ),
      'routeAfterDesignSchema',
    )
  }

  // No tool calls and within retry limit - schema design complete
  return END
}
