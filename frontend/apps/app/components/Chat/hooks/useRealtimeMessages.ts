import type { Tables } from '@liam-hq/db/supabase/database.types'
import { useCallback, useEffect, useState } from 'react'
import { WELCOME_MESSAGE } from '../constants/chatConstants'
import {
  convertMessageToChatEntry,
  loadMessages,
  setupRealtimeSubscription,
} from '../services'
import type { ChatEntry } from '../types/chatTypes'

type UseRealtimeMessagesFunc = (
  designSessionId?: string,
  currentUserId?: string | null,
) => {
  messages: ChatEntry[]
  addOrUpdateMessage: (
    newChatEntry: ChatEntry,
    messageUserId?: string | null,
  ) => void
  isLoadingMessages: boolean
}

export const useRealtimeMessages: UseRealtimeMessagesFunc = (
  designSessionId,
  currentUserId,
) => {
  const [messages, setMessages] = useState<ChatEntry[]>([WELCOME_MESSAGE])
  const [isLoadingMessages, setIsLoadingMessages] = useState(true)

  // Load existing messages on component mount
  useEffect(() => {
    if (!designSessionId) {
      setIsLoadingMessages(false)
      return
    }
    const loadExistingMessages = async () => {
      const result = await loadMessages({ designSessionId })
      if (result.success && result.messages) {
        const chatEntries = result.messages.map((msg) => ({
          ...convertMessageToChatEntry(msg),
          dbId: msg.id,
        }))
        // Keep the welcome message and add loaded messages
        setMessages((prev) => [prev[0], ...chatEntries])
      }
      setIsLoadingMessages(false)
    }

    loadExistingMessages()
  }, [designSessionId])

  // Add or update message with duplicate checking and optimistic update handling
  const addOrUpdateMessage = useCallback(
    (newChatEntry: ChatEntry, messageUserId?: string | null) => {
      setMessages((prev) => {
        // Check if message already exists to prevent duplicates
        if (newChatEntry.dbId) {
          const messageExists = prev.some(
            (msg) => msg.dbId === newChatEntry.dbId,
          )
          if (messageExists) {
            return prev
          }
        }

        // TODO: Improve optimistic update logic - Use temporary IDs or timestamps instead of content comparison for better reliability

        // For user messages from current user, we already add them optimistically
        // so we should update the existing message with the database ID instead of adding a new one
        if (
          newChatEntry.isUser &&
          messageUserId === currentUserId &&
          newChatEntry.dbId
        ) {
          const updated = prev.map((msg) => {
            // Find the most recent user message without a dbId and update it
            if (
              msg.isUser &&
              !msg.dbId &&
              msg.content === newChatEntry.content
            ) {
              return { ...msg, dbId: newChatEntry.dbId }
            }
            return msg
          })

          // Check if we actually updated an existing message
          const wasUpdated = updated.some((msg, index) => msg !== prev[index])
          if (wasUpdated) {
            return updated
          }

          // If no existing message was updated, this might be from another tab
          // so we should add it as a new message
        }

        // For AI messages or messages from other users, add them to the chat
        return [...prev, newChatEntry]
      })
    },
    [currentUserId],
  )

  // Handle new messages from realtime subscription
  const handleNewMessage = useCallback(
    (newMessage: Tables<'messages'>) => {
      // Convert database message to ChatEntry format
      const chatEntry = {
        ...convertMessageToChatEntry(newMessage),
        dbId: newMessage.id,
      }

      // TODO: Implement efficient duplicate checking - Use Set/Map for O(1) duplicate checking instead of O(n) array.some()
      // TODO: Implement smart auto-scroll - Consider user's scroll position and only auto-scroll when user is at bottom

      addOrUpdateMessage(chatEntry, newMessage.user_id)
    },
    [addOrUpdateMessage],
  )

  // TODO: Implement comprehensive error handling - Add user notifications, retry logic, and distinguish between fatal/temporary errors
  const handleRealtimeError = useCallback((_error: Error) => {
    // TODO: Add user notification system and automatic retry mechanism
    // console.error('Realtime subscription error:', error)
  }, [])

  // TODO: Add network failure handling - Implement reconnection logic and offline message sync
  // TODO: Add authentication/authorization validation - Verify user permissions for realtime subscription
  // Set up realtime subscription for new messages only after currentUserId is available
  useEffect(() => {
    if (!designSessionId || currentUserId === null) {
      return
    }

    const subscription = setupRealtimeSubscription(
      designSessionId,
      handleNewMessage,
      handleRealtimeError,
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [designSessionId, currentUserId, handleNewMessage, handleRealtimeError])

  return {
    messages,
    addOrUpdateMessage,
    isLoadingMessages,
  }
}
