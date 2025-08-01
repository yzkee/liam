/**
 * Safely extract tool call IDs from a message's tool_calls array
 * @param toolCalls The tool_calls array from a message
 * @returns Array of non-undefined tool call IDs
 */
export const extractToolCallIds = (toolCalls: unknown): string[] => {
  if (!Array.isArray(toolCalls)) {
    return []
  }

  return toolCalls
    .map((tc: unknown) => {
      if (
        tc &&
        typeof tc === 'object' &&
        'id' in tc &&
        typeof tc.id === 'string'
      ) {
        return tc.id
      }
      return undefined
    })
    .filter((id): id is string => id !== undefined)
}

/**
 * Safely extract tool call details from a message's tool_calls array
 * @param toolCalls The tool_calls array from a message
 * @returns Array of tool call details with id and name
 */
export const extractToolCallDetails = (
  toolCalls: unknown,
): Array<{ id?: string; name?: string }> => {
  if (!Array.isArray(toolCalls)) {
    return []
  }

  return toolCalls.map((tc: unknown) => {
    const result: { id?: string; name?: string } = {}

    if (tc && typeof tc === 'object') {
      if ('id' in tc && typeof tc.id === 'string') {
        result.id = tc.id
      }
      if ('name' in tc && typeof tc.name === 'string') {
        result.name = tc.name
      }
    }

    return result
  })
}

/**
 * Check if a tool call has a matching ID
 * @param toolCalls The tool_calls array from a message
 * @param targetId The ID to match against
 * @returns True if any tool call has the matching ID
 */
export const hasMatchingToolCallId = (
  toolCalls: unknown,
  targetId: string,
): boolean => {
  if (!Array.isArray(toolCalls)) {
    return false
  }

  return toolCalls.some((tc: unknown) => {
    return tc && typeof tc === 'object' && 'id' in tc && tc.id === targetId
  })
}
