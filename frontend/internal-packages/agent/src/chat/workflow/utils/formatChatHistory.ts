/**
 * Format chat history for prompt usage
 * Note: History items should already have "User: " or "Assistant: " prefix
 */
export const formatChatHistory = (history: string[]): string => {
  return history.length > 0 ? history.join('\n') : 'No previous conversation.'
}
