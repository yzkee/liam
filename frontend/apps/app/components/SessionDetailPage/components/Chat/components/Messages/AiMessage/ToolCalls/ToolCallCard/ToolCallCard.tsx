'use client'

import type { ToolMessage as ToolMessageType } from '@langchain/core/messages'
import {
  ArrowTooltipContent,
  ArrowTooltipPortal,
  ArrowTooltipProvider,
  ArrowTooltipRoot,
  ArrowTooltipTrigger,
  Button,
  Check,
  ChevronDown,
  ChevronRight,
  FoldVertical,
  UnfoldVertical,
  Wrench,
  X,
} from '@liam-hq/ui'
import clsx from 'clsx'
import { type FC, useEffect, useMemo, useRef, useState } from 'react'
import type { ToolCalls } from '@/components/SessionDetailPage/schema'
import { extractResponseFromMessage } from '../../../utils/extractResponseFromMessage'
import { ArgumentsDisplay } from './ArgumentsDisplay'
import styles from './ToolCallCard.module.css'
import { getToolDisplayInfo } from './utils/getToolDisplayInfo'
import { parseToolArguments } from './utils/parseToolArguments'

type ToolCallItem = ToolCalls[number]

type Props = {
  toolCall: ToolCallItem
  status?: 'pending' | 'running' | 'completed' | 'error'
  error?: string
  toolMessage?: ToolMessageType | undefined
  onNavigate?: (tab: 'erd' | 'artifact') => void
}

type Status = 'pending' | 'running' | 'completed' | 'error'

// Custom hook for animation state management
const useAnimationState = (status: Status, isPreCompleted: boolean) => {
  const [argumentsReady, setArgumentsReady] = useState(true)
  const [animationStarted, setAnimationStarted] = useState(false)
  const [argumentsAnimationComplete, setArgumentsAnimationComplete] =
    useState(isPreCompleted)

  useEffect(() => {
    if (status === 'pending' || status === 'running') {
      setAnimationStarted(true)
      setArgumentsAnimationComplete(false)
    } else if (status === 'completed' && !animationStarted && !isPreCompleted) {
      setArgumentsReady(true)
      setArgumentsAnimationComplete(true)
    }
  }, [status, animationStarted, isPreCompleted])

  return {
    argumentsReady,
    setArgumentsReady,
    animationStarted,
    argumentsAnimationComplete,
    setArgumentsAnimationComplete,
  }
}

// Custom hook for expand/collapse state
const useExpandState = (status: Status, isPreCompleted: boolean) => {
  const [isCollapsed, setIsCollapsed] = useState(() => isPreCompleted)
  const [isHovering, setIsHovering] = useState(false)
  const [isArgumentsExpanded, setIsArgumentsExpanded] = useState(false)
  const [needsExpandButton, setNeedsExpandButton] = useState(false)
  const [isResultExpanded, setIsResultExpanded] = useState(false)
  const [needsResultExpandButton, setNeedsResultExpandButton] = useState(false)
  const [isResultScrollable, setIsResultScrollable] = useState(false)

  useEffect(() => {
    if (status === 'pending' || status === 'running') {
      setIsCollapsed(false)
    } else if (status === 'completed' && !isPreCompleted) {
      setIsCollapsed(false)
    }
  }, [status, isPreCompleted])

  return {
    isCollapsed,
    setIsCollapsed,
    isHovering,
    setIsHovering,
    isArgumentsExpanded,
    setIsArgumentsExpanded,
    needsExpandButton,
    setNeedsExpandButton,
    isResultExpanded,
    setIsResultExpanded,
    needsResultExpandButton,
    setNeedsResultExpandButton,
    isResultScrollable,
    setIsResultScrollable,
  }
}

export const ToolCallCard: FC<Props> = ({
  toolCall,
  status = 'completed',
  error,
  toolMessage,
  onNavigate,
}) => {
  // Determine if this is a pre-completed tool (no animation needed)
  const isPreCompleted = status === 'completed'

  // Use custom hooks for state management
  const animationState = useAnimationState(status, isPreCompleted)
  const expandState = useExpandState(status, isPreCompleted)

  // Refs for scroll management
  const contentRef = useRef<HTMLDivElement>(null)
  const resultContentRef = useRef<HTMLDivElement>(null)

  const parsedArguments = useMemo(
    () => parseToolArguments(toolCall.function.arguments),
    [toolCall.function.arguments],
  )

  const toolInfo = useMemo(
    () => getToolDisplayInfo(toolCall.function.name),
    [toolCall.function.name],
  )

  // Extract result from toolMessage if available
  const result = useMemo(() => {
    if (toolMessage) {
      return extractResponseFromMessage(toolMessage)
    }
    return 'Tool call result not found.'
  }, [toolMessage, toolCall])

  // Check result status
  const resultStatus = useMemo(() => {
    const lowerResult = result.toLowerCase()
    if (lowerResult.includes('error')) return 'error'
    if (lowerResult.includes('successfully')) return 'success'
    return 'neutral'
  }, [result])

  // Notify when arguments are ready
  const handleArgumentsReady = () => {
    animationState.setArgumentsReady(true)
  }

  const handleToggle = () => {
    expandState.setIsCollapsed((prev) => !prev)
  }

  const isRunning = status === 'pending' || status === 'running'

  // Handler for when a line is added in ArgumentsDisplay
  const handleLineAdded = () => {
    if (contentRef.current && !expandState.isCollapsed && isRunning) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        if (contentRef.current) {
          const element = contentRef.current
          const { scrollHeight, clientHeight } = element

          // Auto-scroll when content exceeds container height
          if (scrollHeight > clientHeight) {
            // Scroll to bottom to show new content
            element.scrollTop = element.scrollHeight
            // Auto-scroll executed
          }
        }
      })
    }
  }

  // Handler for ArgumentsDisplay overflow detection
  const handleArgumentsOverflow = (hasOverflow: boolean) => {
    expandState.setNeedsExpandButton(hasOverflow)
  }

  // Toggle arguments expand/collapse
  const handleToggleArgumentsExpand = () => {
    expandState.setIsArgumentsExpanded((prev) => !prev)
  }

  // Toggle result expand/collapse
  const handleToggleResultExpand = () => {
    expandState.setIsResultExpanded((prev) => !prev)
  }

  // Check if result needs expand button and is scrollable
  useEffect(() => {
    if (resultContentRef.current && result && status === 'completed') {
      const element = resultContentRef.current
      const hasOverflow = element.scrollHeight > 100
      expandState.setNeedsResultExpandButton(hasOverflow)
      expandState.setIsResultScrollable(
        hasOverflow && !expandState.isResultExpanded,
      )
    }
  }, [result, status, expandState.isResultExpanded, expandState])

  return (
    <div
      className={styles.container}
      data-status={status}
      data-collapsed={expandState.isCollapsed}
    >
      <button
        type="button"
        className={styles.header}
        onClick={handleToggle}
        aria-expanded={!expandState.isCollapsed}
        onMouseEnter={() => expandState.setIsHovering(true)}
        onMouseLeave={() => expandState.setIsHovering(false)}
      >
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <div className={styles.iconWrapper}>
              <Wrench
                className={clsx(
                  styles.icon,
                  expandState.isHovering ? styles.iconHidden : '',
                  isRunning ? styles.iconAnimated : '',
                )}
              />
              {expandState.isCollapsed ? (
                <ChevronRight
                  className={clsx(
                    styles.chevron,
                    !expandState.isHovering ? styles.chevronHidden : '',
                  )}
                />
              ) : (
                <ChevronDown
                  className={clsx(
                    styles.chevron,
                    !expandState.isHovering ? styles.chevronHidden : '',
                  )}
                />
              )}
            </div>
            <div className={styles.titleWrapper}>
              <span className={styles.toolName}>{toolInfo.displayName}</span>
              {isRunning && (
                <span className={styles.statusText}>
                  {status === 'pending' ? 'Preparing...' : 'Running...'}
                </span>
              )}
            </div>
          </div>
          <div className={styles.headerRight}>
            {status === 'error' && (
              <span className={styles.badgeError}>Error</span>
            )}
          </div>
        </div>
      </button>

      <div className={styles.contentWrapper}>
        <div className={styles.content} ref={contentRef}>
          {/* Arguments display - use ArgumentsDisplay for all tools */}
          <div
            className={styles.arguments}
            style={{
              visibility: animationState.argumentsReady ? 'visible' : 'hidden',
            }}
          >
            <div className={styles.argumentsHeader}>
              <span className={styles.argumentsTitle}>ARGUMENTS</span>
              {expandState.needsExpandButton && (
                <ArrowTooltipProvider>
                  <ArrowTooltipRoot>
                    <ArrowTooltipTrigger asChild>
                      <button
                        className={styles.argumentsExpandButton}
                        onClick={handleToggleArgumentsExpand}
                        aria-label={
                          expandState.isArgumentsExpanded
                            ? 'Collapse arguments'
                            : 'Expand arguments'
                        }
                        type="button"
                      >
                        {expandState.isArgumentsExpanded ? (
                          <FoldVertical size={14} />
                        ) : (
                          <UnfoldVertical size={14} />
                        )}
                      </button>
                    </ArrowTooltipTrigger>
                    <ArrowTooltipPortal>
                      <ArrowTooltipContent side="left" align="center">
                        {expandState.isArgumentsExpanded
                          ? 'Collapse'
                          : 'Expand'}
                      </ArrowTooltipContent>
                    </ArrowTooltipPortal>
                  </ArrowTooltipRoot>
                </ArrowTooltipProvider>
              )}
            </div>
            <ArgumentsDisplay
              args={parsedArguments}
              isAnimated={
                !isPreCompleted &&
                (animationStarted ||
                  status === 'pending' ||
                  status === 'running')
              }
              onLineAdded={handleLineAdded}
              onReady={handleArgumentsReady}
              isExpanded={expandState.isArgumentsExpanded}
              onOverflowDetected={handleArgumentsOverflow}
              toolName={toolCall.function.name}
              onAnimationComplete={() =>
                animationState.setArgumentsAnimationComplete(true)
              }
            />
          </div>

          {/* Result display - shown after arguments animation completes or for pre-completed tools */}
          {result &&
            status === 'completed' &&
            (isPreCompleted || animationState.argumentsAnimationComplete) && (
              <div className={styles.result}>
                <div className={styles.resultHeader}>
                  <div className={styles.resultTitleWrapper}>
                    <span className={styles.resultTitle}>RESULT</span>
                    {resultStatus === 'error' && (
                      <X className={styles.resultErrorIcon} size={12} />
                    )}
                    {resultStatus === 'success' && (
                      <Check className={styles.resultSuccessIcon} size={12} />
                    )}
                  </div>
                  {expandState.needsResultExpandButton && (
                    <ArrowTooltipProvider>
                      <ArrowTooltipRoot>
                        <ArrowTooltipTrigger asChild>
                          <button
                            className={styles.resultExpandButton}
                            onClick={handleToggleResultExpand}
                            aria-label={
                              expandState.isResultExpanded
                                ? 'Collapse result'
                                : 'Expand result'
                            }
                            type="button"
                          >
                            {expandState.isResultExpanded ? (
                              <FoldVertical size={14} />
                            ) : (
                              <UnfoldVertical size={14} />
                            )}
                          </button>
                        </ArrowTooltipTrigger>
                        <ArrowTooltipPortal>
                          <ArrowTooltipContent side="left" align="center">
                            {expandState.isResultExpanded
                              ? 'Collapse'
                              : 'Expand'}
                          </ArrowTooltipContent>
                        </ArrowTooltipPortal>
                      </ArrowTooltipRoot>
                    </ArrowTooltipProvider>
                  )}
                </div>
                <div className={styles.resultContentWrapper}>
                  {expandState.isResultScrollable &&
                    !expandState.isResultExpanded && (
                      <>
                        <div className={styles.resultGradientTop} />
                        <div className={styles.resultGradientBottom} />
                      </>
                    )}
                  <div
                    className={styles.resultContent}
                    ref={resultContentRef}
                    data-expanded={expandState.isResultExpanded}
                  >
                    <div className={styles.resultMessage}>
                      <span>{result}</span>
                    </div>
                  </div>
                </div>
                {/* Action button for viewing artifacts */}
                {toolInfo.resultAction && (
                  <div className={styles.resultAction}>
                    <Button
                      size="sm"
                      variant="outline-overlay"
                      onClick={() => {
                        if (onNavigate && toolInfo.resultAction) {
                          const tab =
                            toolInfo.resultAction.type === 'erd'
                              ? 'erd'
                              : 'artifact'
                          onNavigate(tab)
                        }
                      }}
                    >
                      {toolInfo.resultAction.label}
                    </Button>
                  </div>
                )}
              </div>
            )}

          {/* Error display */}
          {error && status === 'error' && (
            <div className={styles.error}>
              <span className={styles.errorTitle}>ERROR</span>
              <div className={styles.errorContent}>{error}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
