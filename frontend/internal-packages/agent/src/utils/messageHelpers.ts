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
