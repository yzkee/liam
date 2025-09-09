'use client'

import type { ToolMessage as ToolMessageType } from '@langchain/core/messages'
import { type FC, useEffect, useMemo, useState } from 'react'
import type { ToolCalls as ToolCallsType } from '@/components/SessionDetailPage/schema'
import { ToolCallCard } from './ToolCallCard'
import styles from './ToolCalls.module.css'

type ToolCallWithMessage = {
  toolCall: ToolCallsType[number]
  toolMessage?: ToolMessageType
}

type Props = {
  toolCallsWithMessages: ToolCallWithMessage[]
  isStreaming?: boolean
}

type ToolCallStatus = 'pending' | 'running' | 'completed' | 'error'

type ToolCallState = {
  status: ToolCallStatus
  error?: string
}

export const ToolCalls: FC<Props> = ({ toolCallsWithMessages, isStreaming = false }) => {
  const [toolCallStates, setToolCallStates] = useState<
    Record<string, ToolCallState>
  >({})

  // Filter out routeToAgent tool calls
  const filteredToolCalls = useMemo(
    () => toolCallsWithMessages.filter(
      ({ toolCall }) => toolCall.function.name !== 'routeToAgent'
    ),
    [toolCallsWithMessages]
  )

  // Initialize tool call states
  useEffect(() => {
    const newStates: Record<string, ToolCallState> = {}
    filteredToolCalls.forEach(({ toolCall: tc }) => {
      if (!toolCallStates[tc.id]) {
        // If not streaming (loading existing session), show as completed immediately
        // If streaming (new execution), start with pending for animation
        const initialStatus = isStreaming ? 'pending' : 'completed'
        newStates[tc.id] = {
          status: initialStatus
        }
      }
    })
    if (Object.keys(newStates).length > 0) {
      setToolCallStates((prev) => ({ ...prev, ...newStates }))
    }
  }, [filteredToolCalls, isStreaming])

  // Execute tools sequentially - Only for streaming
  useEffect(() => {
    // Only run tools if streaming
    if (!isStreaming) return
    
    const runTools = async () => {
      for (const { toolCall: tc } of filteredToolCalls) {
        // Wait before starting (for better visibility)
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Update to running state
        setToolCallStates((prev) => {
          // Skip if already processed
          if (
            prev[tc.id]?.status === 'running' ||
            prev[tc.id]?.status === 'completed' ||
            prev[tc.id]?.status === 'error'
          ) {
            return prev
          }
          return {
            ...prev,
            [tc.id]: { ...prev[tc.id], status: 'running' },
          }
        })

        // Simulate execution time
        // Shorter time for non-streaming (2s) vs streaming (5s)
        const executionTime = isStreaming ? 5000 : 2000
        await new Promise((resolve) => setTimeout(resolve, executionTime))

        // Update to completed state without hardcoded result
        setToolCallStates((prev) => ({
          ...prev,
          [tc.id]: {
            ...prev[tc.id],
            status: 'completed',
            // Don't set result here - it should come from toolMessage
          },
        }))
      }
    }

    // Run for all tools to show animation
    if (filteredToolCalls.length > 0) {
      runTools()
    }
  }, [filteredToolCalls, isStreaming])

  if (filteredToolCalls.length === 0) return null

  return (
    <div className={styles.container}>
      {filteredToolCalls.map(({ toolCall: tc, toolMessage }) => {
        const state = toolCallStates[tc.id] || { status: 'pending' }
        return (
          <ToolCallCard
            key={tc.id}
            toolCall={tc}
            status={state.status}
            error={state.error}
            toolMessage={toolMessage}
          />
        )
      })}
    </div>
  )
}
