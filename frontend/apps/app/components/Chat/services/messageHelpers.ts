import type { ChatEntry } from '../types/chatTypes'

/**
 * Helper function to create a ChatEntry from an existing message and additional properties
 */
export const createChatEntry = (
  baseMessage: ChatEntry,
  additionalProps: Partial<ChatEntry>,
): ChatEntry => {
  return { ...baseMessage, ...additionalProps }
}

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
  return messages
    .filter((msg) => msg.id !== 'welcome')
    .map((msg) => [msg.isUser ? 'Human' : 'AI', msg.content])
}
