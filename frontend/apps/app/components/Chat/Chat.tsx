'use client'

import type { TableGroupData } from '@/app/lib/schema/convertSchemaToText'
import type { Schema } from '@liam-hq/db-structure'
import type { FC } from 'react'
import { useEffect, useRef, useState } from 'react'
import { ChatInput } from '../ChatInput'
import type { Mode } from '../ChatInput/components/ModeToggleSwitch/ModeToggleSwitch'
import { ChatMessage } from '../ChatMessage'
import styles from './Chat.module.css'
import { ERROR_MESSAGES, WELCOME_MESSAGE } from './constants/chatConstants'
import {
  convertMessageToChatEntry,
  getCurrentUserId,
  loadMessages,
  saveMessage,
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
}

export const Chat: FC<Props> = ({
  schemaData,
  tableGroups,
  designSessionId,
  organizationId,
}) => {
  const [messages, setMessages] = useState<ChatEntry[]>([WELCOME_MESSAGE])
  const [isLoading, setIsLoading] = useState(false)
  const [currentMode, setCurrentMode] = useState<Mode>('ask')
  const [isLoadingMessages, setIsLoadingMessages] = useState(true)
  const [progressMessages, setProgressMessages] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
        // Keep the welcome message and add loaded messages
        setMessages((prev) => [prev[0], ...chatEntries])
      }
      setIsLoadingMessages(false)
    }

    loadExistingMessages()
  }, [designSessionId])

  // Scroll to bottom when component mounts or messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

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

      // Read the stream
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
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
          break
        }

        // Decode the chunk and process JSON messages
        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n').filter((line) => line.trim())

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line)

            // Validate the parsed data has the expected structure
            if (!isResponseChunk(parsed)) {
              console.error('Invalid response format:', parsed)
              continue
            }

            if (parsed.type === 'text') {
              // Append text content to accumulated content
              accumulatedContent += parsed.content

              // Update the AI message with the accumulated content (without timestamp)
              // Keep isGenerating: true during streaming
              setMessages((prev) => {
                // Update immediately to improve streaming UX
                const updatedMessages = [...prev]
                const aiMsgIndex = updatedMessages.findIndex(
                  (msg) => msg.id === aiMessageId,
                )

                if (aiMsgIndex >= 0) {
                  updatedMessages[aiMsgIndex] = createChatEntry(
                    updatedMessages[aiMsgIndex],
                    {
                      content: accumulatedContent,
                      isGenerating: true,
                    },
                  )
                }

                return updatedMessages
              })

              // Force immediate update for smoother streaming experience
              // Using a small timeout to allow React to batch updates
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
              }, 10)
            } else if (parsed.type === 'custom') {
              // Update progress messages
              setProgressMessages((prev) =>
                updateProgressMessages(prev, parsed.content),
              )
            } else if (parsed.type === 'error') {
              // Handle error message
              console.error('Stream error:', parsed.content)
              setProgressMessages([])
              throw new Error(parsed.content)
            }
          } catch {
            // If JSON parsing fails, treat as plain text (backward compatibility)
            accumulatedContent += chunk
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMessageId
                  ? createChatEntry(msg, {
                      content: accumulatedContent,
                      isGenerating: true,
                    })
                  : msg,
              ),
            )
          }
        }

        // Scroll to bottom as content streams in
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
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
