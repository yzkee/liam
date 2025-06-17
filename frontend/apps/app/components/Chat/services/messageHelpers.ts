import type { ChatEntry } from '../types/chatTypes'

/**
 * Generate unique message ID
 */
export const generateMessageId = (prefix: string): string => {
  return `${prefix}-${Date.now()}`
}

/**
 * Format chat history for API
 */
export const formatChatHistory = (
  messages: ChatEntry[],
): [string, string][] => {
  return messages.map((msg) => [
    msg.role === 'user' ? 'Human' : 'AI',
    msg.content,
  ])
}
