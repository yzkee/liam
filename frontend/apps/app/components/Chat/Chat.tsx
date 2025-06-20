'use client'

import type { Schema, TableGroup } from '@liam-hq/db-structure'
import { type FC, useEffect, useRef, useState, useTransition } from 'react'
import { ChatInput } from '../ChatInput'
import { TimelineItem } from '../TimelineItem'
import styles from './Chat.module.css'
import {
  type TimelineItemType,
  useRealtimeTimelineItems,
} from './hooks/useRealtimeTimelineItems'
import { getCurrentUserId } from './services'
import { sendChatMessage } from './services/aiMessageService'
import { generateTimelineItemId } from './services/timelineItemHelpers'
import type { TimelineItemEntry } from './types/chatTypes'

type DesignSession = {
  id: string
  organizationId: string
  timelineItems: TimelineItemType[]
  buildingSchemaId: string
  latestVersionNumber?: number
}

interface Props {
  schemaData: Schema
  tableGroups?: Record<string, TableGroup>
  designSession: DesignSession
}

export const Chat: FC<Props> = ({ schemaData, tableGroups, designSession }) => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const { timelineItems, addOrUpdateTimelineItem } = useRealtimeTimelineItems(
    designSession,
    currentUserId,
  )
  const [isLoading, startTransition] = useTransition()
  const [progressMessages, setProgressMessages] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const autoStartExecuted = useRef(false)

  // Get current user ID on component mount
  useEffect(() => {
    const fetchUserId = async () => {
      const userId = await getCurrentUserId()
      setCurrentUserId(userId)
    }
    fetchUserId()
  }, [])

  // Auto-start AI response for initial user message
  useEffect(() => {
    if (!currentUserId || autoStartExecuted.current || isLoading) return

    // Only auto-start if there's exactly one timeline item and it's from user
    if (
      designSession.timelineItems.length === 1 &&
      designSession.timelineItems[0].type === 'user'
    ) {
      const initialTimelineItem = designSession.timelineItems[0]
      autoStartExecuted.current = true
      startTransition(() => {
        startAIResponse(initialTimelineItem.content)
      })
    }
  }, [currentUserId, designSession.timelineItems, isLoading])

  // Scroll to bottom when component mounts or messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Start AI response without saving user message (for auto-start scenarios)
  const startAIResponse = async (content: string) => {
    if (!currentUserId) return

    // Send chat message to API
    const result = await sendChatMessage({
      message: content,
      tableGroups,
      timelineItems,
      designSession,
      setProgressMessages,
      currentUserId,
    })

    if (result.success) {
      // Scroll to bottom after successful completion
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 10)
    }
  }

  // TODO: Add rate limiting - Implement rate limiting for message sending to prevent spam
  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: TimelineItemEntry = {
      id: generateTimelineItemId('user'),
      content,
      role: 'user',
      timestamp: new Date(),
      isGenerating: false, // Explicitly set to false for consistency
    }
    addOrUpdateTimelineItem(userMessage)

    startTransition(() => {
      startAIResponse(content)
    })
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.messagesContainer}>
        {/* Display all timeline items */}
        {timelineItems.map((timelineItem, index) => {
          // Check if this is the last AI timeline item and has progress messages
          const isLastAITimelineItem =
            timelineItem.role !== 'user' && index === timelineItems.length - 1
          const shouldShowProgress =
            progressMessages.length > 0 && isLastAITimelineItem

          return (
            <TimelineItem
              key={timelineItem.id}
              {...timelineItem}
              progressMessages={
                shouldShowProgress ? progressMessages : undefined
              }
              showProgress={shouldShowProgress}
            />
          )
        })}
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
      />
    </div>
  )
}
