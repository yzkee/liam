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
  onNavigate?: (tab: 'erd' | 'artifact') => void
}

type ToolCallStatus = 'pending' | 'running' | 'completed' | 'error'

type ToolCallState = {
  status: ToolCallStatus
  error?: string
}

export const ToolCalls: FC<Props> = ({
  toolCallsWithMessages,
  isStreaming = false, // Default to false for loaded sessions
  onNavigate,
}) => {
  const [toolCallStates, setToolCallStates] = useState<
    Record<string, ToolCallState>
  >({})

  // Filter out routeToAgent tool calls
  const filteredToolCalls = useMemo(
    () =>
      toolCallsWithMessages.filter(
        ({ toolCall }) => toolCall.function.name !== 'routeToAgent',
      ),
    [toolCallsWithMessages],
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
          status: initialStatus,
        }
      }
    })
    if (Object.keys(newStates).length > 0) {
      setToolCallStates((prev) => ({ ...prev, ...newStates }))
    }
  }, [filteredToolCalls, isStreaming, toolCallStates])

  // Execute tools sequentially - Only for streaming
  useEffect(() => {
    // Only run tools if streaming
    if (!isStreaming) return

    // Create an AbortController for cancellation
    const abortController = new AbortController()
    const cancelled = { value: false }

    // Helper to create a cancellable delay
    const wait = (ms: number): Promise<void> => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          if (!cancelled.value) {
            resolve()
          } else {
            reject(new Error('Cancelled'))
          }
        }, ms)
        abortController.signal.addEventListener('abort', () => {
          clearTimeout(timer)
          reject(new Error('Cancelled'))
        })
      })
    }

    const runTools = async () => {
      for (const { toolCall: tc } of filteredToolCalls) {
        // Check if cancelled before starting
        if (cancelled.value) break

        // Skip if already completed in state
        const currentState = toolCallStates[tc.id]
        if (
          currentState?.status === 'completed' ||
          currentState?.status === 'error'
        ) {
          continue
        }

        try {
          // Wait before starting (for better visibility)
          await wait(1000)

          // Check if cancelled after wait
          if (cancelled.value) break

          // Update to running state
          setToolCallStates((prev) => {
            // Check again if cancelled
            if (cancelled.value) return prev

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
          await wait(executionTime)

          // Check if cancelled after execution
          if (cancelled.value) break

          // Update to completed state without hardcoded result
          setToolCallStates((prev) => {
            // Check again if cancelled
            if (cancelled.value) return prev

            return {
              ...prev,
              [tc.id]: {
                ...prev[tc.id],
                status: 'completed',
                // Don't set result here - it should come from toolMessage
              },
            }
          })
        } catch (error) {
          // If cancelled, just break out of the loop
          if (error instanceof Error && error.message === 'Cancelled') {
            break
          }
          // Handle other errors if needed
        }
      }
    }

    // Run for all tools to show animation
    if (filteredToolCalls.length > 0) {
      runTools()
    }

    // Cleanup function
    return () => {
      cancelled.value = true
      abortController.abort()
    }
  }, [filteredToolCalls, isStreaming, toolCallStates])

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
            onNavigate={onNavigate}
          />
        )
      })}
    </div>
  )
}
