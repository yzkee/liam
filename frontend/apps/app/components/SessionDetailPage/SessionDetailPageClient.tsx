'use client'

import {
  HumanMessage,
  mapStoredMessagesToChatMessages,
  type StoredMessage,
} from '@langchain/core/messages'
import type { Artifact } from '@liam-hq/artifact'
import type { Schema } from '@liam-hq/schema'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@liam-hq/ui'
import { type FC, useCallback, useEffect, useRef, useState } from 'react'
import { setCookieJson } from '../../libs/utils/cookie'
import { Chat } from './components/Chat'
import { Output } from './components/Output'
import { useRealtimeArtifact } from './components/Output/components/Artifact/hooks/useRealtimeArtifact'
import { OUTPUT_TABS, type OutputTabValue } from './components/Output/constants'
import { PANEL_LAYOUT_COOKIE_NAME } from './constants'
import { useRealtimeVersionsWithSchema } from './hooks/useRealtimeVersionsWithSchema'
import { useStream } from './hooks/useStream'
import { SQL_REVIEW_COMMENTS } from './mock'
import styles from './SessionDetailPageClient.module.css'
import type { Version } from './types'
import { determineWorkflowAction } from './utils/determineWorkflowAction'
import { getWorkflowInProgress } from './utils/workflowStorage'

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7

type Props = {
  buildingSchemaId: string
  designSessionId: string
  initialMessages: StoredMessage[]
  initialDisplayedSchema: Schema
  initialPrevSchema: Schema
  initialVersions: Version[]
  isDeepModelingEnabled: boolean
  initialIsPublic: boolean
  initialWorkflowError?: string | null
  initialArtifact: Artifact | null
  senderName: string
  panelSizes: number[]
}

// Determine the initial active tab based on available data
const determineInitialTab = (
  artifact: Artifact | null,
  versions: Version[],
): OutputTabValue | undefined => {
  const hasArtifact = artifact !== null
  const hasVersions = versions.length > 0

  if (!hasArtifact && !hasVersions) {
    return undefined
  }

  // Prioritize ERD tab when versions exist
  if (hasVersions) {
    return OUTPUT_TABS.ERD
  }

  // Show artifact tab when only artifact exists
  if (hasArtifact) {
    return OUTPUT_TABS.ARTIFACT
  }

  return undefined
}

export const SessionDetailPageClient: FC<Props> = ({
  buildingSchemaId,
  designSessionId,
  initialMessages,
  initialDisplayedSchema,
  initialPrevSchema,
  initialVersions,
  isDeepModelingEnabled,
  initialIsPublic,
  initialWorkflowError,
  initialArtifact,
  senderName,
  panelSizes,
}) => {
  const [activeTab, setActiveTab] = useState<OutputTabValue | undefined>(
    determineInitialTab(initialArtifact, initialVersions),
  )
  const [isResizing, setIsResizing] = useState(false)
  const [hasReceivedAnalyzedRequirements, setHasReceivedAnalyzedRequirements] =
    useState(false)

  const {
    versions,
    selectedVersion,
    setSelectedVersion,
    displayedSchema,
    prevSchema,
  } = useRealtimeVersionsWithSchema({
    buildingSchemaId,
    initialVersions,
    initialDisplayedSchema,
    initialPrevSchema,
    onChangeSelectedVersion: (version: Version) => {
      setSelectedVersion(version)
      setActiveTab(OUTPUT_TABS.ERD)
    },
  })

  const handleVersionChange = useCallback(
    (version: Version) => {
      setSelectedVersion(version)
      setActiveTab(OUTPUT_TABS.ERD)
    },
    [setSelectedVersion],
  )

  const handleArtifactChange = useCallback((newArtifact: unknown) => {
    if (newArtifact !== null) {
      setActiveTab(OUTPUT_TABS.ARTIFACT)
    }
  }, [])

  const { artifact, error: artifactError } = useRealtimeArtifact({
    designSessionId,
    initialArtifact,
    onChangeArtifact: handleArtifactChange,
  })

  const chatMessages = mapStoredMessagesToChatMessages(initialMessages)
  const { isStreaming, messages, setMessages, analyzedRequirements, start, replay, error } =
    useStream({
      initialMessages: chatMessages,
      designSessionId,
    })

  useEffect(() => {
    if (analyzedRequirements !== null && !hasReceivedAnalyzedRequirements) {
      setActiveTab(OUTPUT_TABS.ARTIFACT)
      setHasReceivedAnalyzedRequirements(true)
    }
  }, [analyzedRequirements, hasReceivedAnalyzedRequirements])

  const shouldShowOutputSection =
    (artifact !== null ||
      selectedVersion !== null ||
      analyzedRequirements !== null) &&
    activeTab

  const handleLayoutChange = useCallback((sizes: number[]) => {
    setCookieJson(PANEL_LAYOUT_COOKIE_NAME, sizes, {
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    })
  }, [])

  // Combine streaming error with workflow errors
  const combinedError = error || initialWorkflowError
  // Track if initial workflow has been triggered to prevent multiple executions
  const hasTriggeredInitialWorkflow = useRef(false)

  const handleSendMessage = useCallback(
    async (content: string) => {
      const tempId = `optimistic-${crypto.randomUUID()}`
      const optimisticMessage = new HumanMessage({
        content,
        id: tempId,
        additional_kwargs: {
          userName: senderName,
        },
      })
      setMessages((prev) => [...prev, optimisticMessage])

      const result = await start({
        userInput: content,
        designSessionId,
        isDeepModelingEnabled,
      })

      if (result.isErr()) {
        setMessages((prev) => prev.filter((msg) => msg.id !== tempId))
      }
    },
    [setMessages, start, senderName, designSessionId, isDeepModelingEnabled],
  )

  // Auto-trigger workflow on page load if there's an unanswered user message
  useEffect(() => {
    const triggerInitialWorkflow = async () => {
      const isWorkflowInProgress = getWorkflowInProgress(designSessionId)

      const action = determineWorkflowAction(
        messages,
        isWorkflowInProgress,
        hasTriggeredInitialWorkflow.current,
      )

      if (action.type === 'none') return

      // Mark as triggered before the async call
      hasTriggeredInitialWorkflow.current = true

      if (action.type === 'replay') {
        // Trigger replay for interrupted workflow
        await replay({
          designSessionId,
          isDeepModelingEnabled,
        })
      } else if (action.type === 'start') {
        // Trigger the workflow for the initial user message
        await start({
          designSessionId,
          userInput: action.userInput,
          isDeepModelingEnabled,
        })
      }
    }

    triggerInitialWorkflow()
  }, [messages, designSessionId, isDeepModelingEnabled, start, replay])

  return (
    <div className={styles.container}>
      <ResizablePanelGroup
        direction="horizontal"
        className={styles.columns}
        data-layout={shouldShowOutputSection ? 'two-columns' : 'one-column'}
        onLayout={handleLayoutChange}
      >
        <ResizablePanel
          defaultSize={panelSizes[0]}
          minSize={22}
          maxSize={70}
          isResizing={isResizing}
        >
          <div className={styles.chatSection}>
            <div className={styles.chatWrapper}>
              <Chat
                schemaData={displayedSchema}
                messages={messages}
                isWorkflowRunning={isStreaming}
                onSendMessage={handleSendMessage}
                onNavigate={setActiveTab}
                error={combinedError}
              />
            </div>
          </div>
        </ResizablePanel>
        {shouldShowOutputSection && (
          <>
            <ResizableHandle onDragging={(e) => setIsResizing(e)} />
            <ResizablePanel
              defaultSize={panelSizes[1]}
              minSize={30}
              maxSize={78}
              isResizing={isResizing}
            >
              <div className={styles.outputSection}>
                <Output
                  designSessionId={designSessionId}
                  schema={displayedSchema}
                  prevSchema={prevSchema}
                  sqlReviewComments={SQL_REVIEW_COMMENTS}
                  versions={versions}
                  selectedVersion={selectedVersion}
                  onSelectedVersionChange={handleVersionChange}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  initialIsPublic={initialIsPublic}
                  artifact={artifact}
                  artifactError={artifactError}
                  analyzedRequirements={analyzedRequirements}
                />
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  )
}
