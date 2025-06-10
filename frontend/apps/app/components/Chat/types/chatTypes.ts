import type { ChatMessageProps } from '../../ChatMessage'

/**
 * Represents a chat message entry with additional metadata
 */
export interface ChatEntry extends ChatMessageProps {
  /** Unique identifier for the message */
  id: string
  /** Database message ID for persistence */
  dbId?: string
}

/**
 * Type guard for streaming response chunks
 */
export interface ResponseChunk {
  type: string
  content: string
}
