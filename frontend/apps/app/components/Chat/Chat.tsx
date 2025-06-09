'use client'

import type { TableGroupData } from '@/app/lib/schema/convertSchemaToText'
import type { Schema } from '@liam-hq/db-structure'
import type { Tables } from '@liam-hq/db/supabase/database.types'
import type { FC } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChatInput } from '../ChatInput'
import type { Mode } from '../ChatInput/components/ModeToggleSwitch/ModeToggleSwitch'
import { ChatMessage } from '../ChatMessage'
import styles from './Chat.module.css'
import { ERROR_MESSAGES } from './constants/chatConstants'
import {
  convertMessageToChatEntry,
  getCurrentUserId,
  loadMessages,
  saveMessage,
  setupRealtimeSubscription,
} from './services'
import {
  createChatEntry,
  formatChatHistory,
  generateMessageId,
  isResponseChunk,
  updateProgressMessages,
} from './services/messageHelpers'
import type { ChatEntry } from './types/chatTypes'

interface Props {
  schemaData: Schema
  tableGroups?: Record<string, TableGroupData>
  designSessionId?: string
  organizationId?: string
  buildingSchemaId: string
  latestVersionNumber?: number
}

export const Chat: FC<Props> = ({
  schemaData,
  tableGroups,
  designSessionId,
  organizationId,
  buildingSchemaId,
  latestVersionNumber = 0,
}) => {
  const [messages, setMessages] = useState<ChatEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentMode, setCurrentMode] = useState<Mode>('ask')
  const [isLoadingMessages, setIsLoadingMessages] = useState(true)
  const [progressMessages, setProgressMessages] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [hasTriggeredAutoResponse, setHasTriggeredAutoResponse] =
    useState(false)

  // TODO: Extract complex state management into custom hook - Create useRealtimeChat hook for better testability and reusability
  // TODO: Add connection state management - Track realtime connection status and display to user

  // Get current user ID on component mount
  useEffect(() => {
    const fetchUserId = async () => {
      const userId = await getCurrentUserId()
      setCurrentUserId(userId)
    }
    fetchUserId()
  }, [])

  // Load existing messages on component mount
  useEffect(() => {
    if (!designSessionId) {
      return
    }
    const loadExistingMessages = async () => {
      const result = await loadMessages({ designSessionId })
      if (result.success && result.messages) {
        const chatEntries = result.messages.map((msg) => ({
          ...convertMessageToChatEntry(msg),
          dbId: msg.id,
        }))
        setMessages(chatEntries)
      }
      setIsLoadingMessages(false)
    }

    loadExistingMessages()
  }, [designSessionId])

  // Check for unanswered messages and trigger auto response
  useEffect(() => {
    if (!designSessionId || hasTriggeredAutoResponse || isLoadingMessages) {
      return
    }

    const checkForUnansweredMessages = async () => {
      // Find the latest user message that doesn't have a following AI response
      const userMessageIndex = messages.findLastIndex((msg) => msg.isUser)
      if (userMessageIndex === -1) return

      // Check if there's already an AI response after this user message
      const hasAIResponse = messages
        .slice(userMessageIndex + 1)
        .some((msg) => !msg.isUser)

      if (!hasAIResponse) {
        // There's an unanswered user message, trigger auto response
        setHasTriggeredAutoResponse(true)
        const latestUserMessage = messages[userMessageIndex]

        // Trigger auto response directly
        await triggerAutoResponse(latestUserMessage.content)
      }
    }

    // Delay the check to ensure component is fully initialized
    const timeoutId = setTimeout(checkForUnansweredMessages, 1000)

    return () => clearTimeout(timeoutId)
  }, [messages, hasTriggeredAutoResponse, isLoadingMessages, designSessionId])

  // Update AI message content during streaming
  const updateStreamingMessage = useCallback(
    (aiMessageId: string, content: string) => {
      setMessages((prev) => {
        const updatedMessages = [...prev]
        const aiMsgIndex = updatedMessages.findIndex(
          (msg) => msg.id === aiMessageId,
        )

        if (aiMsgIndex >= 0) {
          updatedMessages[aiMsgIndex] = createChatEntry(
            updatedMessages[aiMsgIndex],
            {
              content,
              isGenerating: true,
            },
          )
        }

        return updatedMessages
      })

      // Force immediate update for smoother streaming experience
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 10)
    },
    [],
  )

  // Process a single parsed message from stream
  const processStreamMessage = useCallback(
    (parsed: unknown, accumulatedContent: string, aiMessageId: string) => {
      if (parsed.type === 'text') {
        const newContent = accumulatedContent + parsed.content
        updateStreamingMessage(aiMessageId, newContent)
        return newContent
      }
      if (parsed.type === 'custom') {
        setProgressMessages((prev) =>
          updateProgressMessages(prev, parsed.content),
        )
      } else if (parsed.type === 'error') {
        console.error('Stream error:', parsed.content)
        setProgressMessages([])
        throw new Error(parsed.content)
      }
      return accumulatedContent
    },
    [updateStreamingMessage],
  )

  // Process lines from streaming chunk
  const processStreamLines = useCallback(
    (lines: string[], accumulatedContent: string, aiMessageId: string) => {
      let content = accumulatedContent

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line)

          if (!isResponseChunk(parsed)) {
            console.error('Invalid response format:', parsed)
            continue
          }

          content = processStreamMessage(parsed, content, aiMessageId)
        } catch (error) {
          if (error instanceof Error && error.message.includes('JSON')) {
            // Handle non-JSON content as plain text
            updateStreamingMessage(aiMessageId, content)
          } else {
            throw error
          }
        }
      }

      return content
    },
    [processStreamMessage, updateStreamingMessage],
  )

  // Common streaming processor with UI updates
  const processStreamingWithUI = useCallback(
    async (
      reader: ReadableStreamDefaultReader<Uint8Array>,
      aiMessageId: string,
    ) => {
      let accumulatedContent = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          return accumulatedContent
        }

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n').filter((line) => line.trim())

        accumulatedContent = processStreamLines(
          lines,
          accumulatedContent,
          aiMessageId,
        )

        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
    },
    [processStreamLines],
  )

  // Process streaming response from chat API (for auto response)
  const processStreamingResponse = useCallback(
    async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
      // Create AI message placeholder for auto response streaming
      const aiMessageId = generateMessageId('ai')
      const aiMessage: ChatEntry = {
        id: aiMessageId,
        content: '',
        isUser: false,
        isGenerating: true,
        agentType: 'ask',
      }
      setMessages((prev) => [...prev, aiMessage])

      // Process streaming with UI updates
      const content = await processStreamingWithUI(reader, aiMessageId)

      // Update message with final content and timestamp
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? createChatEntry(msg, {
                content,
                timestamp: new Date(),
                isGenerating: false,
              })
            : msg,
        ),
      )

      return content
    },
    [processStreamingWithUI],
  )

  // Call chat API and get response
  const callChatAPI = useCallback(
    async (userMessage: string) => {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          schemaData,
          tableGroups,
          history: formatChatHistory(messages),
          mode: 'ask',
          organizationId,
          buildingSchemaId,
          latestVersionNumber,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get auto response')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Response body is not readable')
      }

      return reader
    },
    [
      messages,
      schemaData,
      tableGroups,
      organizationId,
      buildingSchemaId,
      latestVersionNumber,
    ],
  )

  // Save message to database
  const saveAutoResponseMessage = useCallback(
    async (content: string, isError = false) => {
      if (!designSessionId) return

      await saveMessage({
        designSessionId,
        content: isError
          ? 'Sorry, an error occurred while generating a response. Please try again.'
          : content,
        role: 'assistant',
        userId: null,
      })
    },
    [designSessionId],
  )

  // Auto response function
  const triggerAutoResponse = useCallback(
    async (userMessage: string) => {
      try {
        const reader = await callChatAPI(userMessage)
        const content = await processStreamingResponse(reader)
        await saveAutoResponseMessage(content)
      } catch (error) {
        console.error('Error in auto response:', error)
        await saveAutoResponseMessage('', true)
      }
    },
    [callChatAPI, processStreamingResponse, saveAutoResponseMessage],
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

      // Check if message already exists to prevent duplicates
      setMessages((prev) => {
        const messageExists = prev.some((msg) => msg.dbId === newMessage.id)
        if (messageExists) {
          return prev
        }

        // TODO: Improve optimistic update logic - Use temporary IDs or timestamps instead of content comparison for better reliability

        // For user messages from current user, we already add them optimistically
        // so we should update the existing message with the database ID instead of adding a new one
        if (chatEntry.isUser && newMessage.user_id === currentUserId) {
          const updated = prev.map((msg) => {
            // Find the most recent user message without a dbId and update it
            if (msg.isUser && !msg.dbId && msg.content === newMessage.content) {
              return { ...msg, dbId: newMessage.id }
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

        // TODO: Implement smart auto-scroll - Consider user's scroll position and only auto-scroll when user is at bottom

        // Add the new message and scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)

        return [...prev, chatEntry]
      })
    },
    [currentUserId],
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

  // Scroll to bottom when component mounts or messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // TODO: Add rate limiting - Implement rate limiting for message sending to prevent spam
  // biome-ignore  lint/complexity/noExcessiveCognitiveComplexity: fix later
  const handleSendMessage = async (content: string, mode: Mode) => {
    // Update the current mode and agent type
    setCurrentMode(mode)

    // Get current user ID for persistence
    const userId = await getCurrentUserId()

    // Add user message
    const userMessage: ChatEntry = {
      id: generateMessageId('user'),
      content,
      isUser: true,
      timestamp: new Date(),
      isGenerating: false, // Explicitly set to false for consistency
      agentType: mode, // Store the current mode with the user message as well
    }
    setMessages((prev) => [...prev, userMessage])

    // Save user message to database
    if (designSessionId) {
      const saveResult = await saveMessage({
        designSessionId,
        content,
        role: 'user',
        userId,
      })
      if (saveResult.success && saveResult.message) {
        // Update the message with the database ID
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === userMessage.id
              ? { ...msg, dbId: saveResult.message?.id }
              : msg,
          ),
        )
      }
    }

    setIsLoading(true)

    // Create AI message placeholder for streaming (without timestamp)
    const aiMessageId = generateMessageId('ai')
    const aiMessage: ChatEntry = {
      id: aiMessageId,
      content: '',
      isUser: false,
      // No timestamp during streaming
      isGenerating: true, // Mark as generating
      agentType: mode, // Store the current mode with the message
    }
    setMessages((prev) => [...prev, aiMessage])

    try {
      // Format chat history for API
      const history = formatChatHistory(messages)

      // Call API with streaming response
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          schemaData,
          tableGroups,
          history,
          mode,
          organizationId,
          buildingSchemaId,
          latestVersionNumber,
        }),
      })

      if (!response.ok) {
        throw new Error(ERROR_MESSAGES.FETCH_FAILED)
      }

      // Process the streaming response
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error(ERROR_MESSAGES.RESPONSE_NOT_READABLE)
      }

      let accumulatedContent = ''
      let aiDbId: string | undefined

      // Process streaming with UI updates
      accumulatedContent = await processStreamingWithUI(reader, aiMessageId)

      // Streaming is complete, save to database and add timestamp
      if (designSessionId) {
        const saveResult = await saveMessage({
          designSessionId,
          content: accumulatedContent,
          role: 'assistant',
          userId: null,
        })
        if (saveResult.success && saveResult.message) {
          aiDbId = saveResult.message.id
        }
      }

      // Update message with final content, timestamp, and database ID
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? createChatEntry(msg, {
                content: accumulatedContent,
                timestamp: new Date(),
                isGenerating: false, // Remove generating state when complete
                dbId: aiDbId,
              })
            : msg,
        ),
      )
    } catch (error) {
      console.error('Error sending message:', error)
      // Clear progress messages and streaming state on error
      setProgressMessages([])

      // Update error in the AI message or add a new error message
      setMessages((prev) => {
        // Check if we already added an AI message that we can update
        const aiMessageIndex = prev.findIndex((msg) => msg.id.startsWith('ai-'))

        if (aiMessageIndex >= 0 && prev[aiMessageIndex].content === '') {
          // Update the existing empty message with error, add timestamp, and remove generating state
          const updatedMessages = [...prev]
          updatedMessages[aiMessageIndex] = createChatEntry(
            updatedMessages[aiMessageIndex],
            {
              content: ERROR_MESSAGES.GENERAL,
              timestamp: new Date(),
              isGenerating: false, // Remove generating state on error
              agentType: mode, // Ensure the agent type is set for error messages
            },
          )
          return updatedMessages
        }

        // Create a new error message with timestamp
        const errorMessage: ChatEntry = {
          id: generateMessageId('error'),
          content: ERROR_MESSAGES.GENERAL,
          isUser: false,
          timestamp: new Date(),
          isGenerating: false, // Ensure error message is not in generating state
          agentType: mode, // Use the current mode for error messages
        }

        // Add the error message to the messages array
        return [...prev, errorMessage]
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.messagesContainer}>
        {isLoadingMessages ? (
          <div className={styles.loadingIndicator}>
            <div className={styles.loadingDot} />
            <div className={styles.loadingDot} />
            <div className={styles.loadingDot} />
          </div>
        ) : (
          <>
            {/* Display all messages */}
            {messages.map((message, index) => {
              // Check if this is the last AI message and has progress messages
              const isLastAIMessage =
                !message.isUser && index === messages.length - 1
              const shouldShowProgress =
                progressMessages.length > 0 && isLastAIMessage

              return (
                <ChatMessage
                  key={message.id}
                  content={message.content}
                  isUser={message.isUser}
                  timestamp={message.timestamp}
                  isGenerating={message.isGenerating}
                  agentType={message.agentType || currentMode}
                  progressMessages={
                    shouldShowProgress ? progressMessages : undefined
                  }
                  showProgress={shouldShowProgress}
                />
              )
            })}
          </>
        )}
        {isLoading && (
          <div className={styles.loadingIndicator}>
            <div className={styles.loadingDot} />
            <div className={styles.loadingDot} />
            <div className={styles.loadingDot} />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <ChatInput
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        schema={schemaData}
        initialMode={currentMode}
      />
    </div>
  )
}
