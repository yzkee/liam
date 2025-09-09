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

// Custom hook for tool data processing
const useToolData = (
  toolCall: ToolCallItem,
  toolMessage: ToolMessageType | undefined,
) => {
  const parsedArguments = useMemo(
    () => parseToolArguments(toolCall.function.arguments),
    [toolCall.function.arguments],
  )

  const toolInfo = useMemo(
    () => getToolDisplayInfo(toolCall.function.name),
    [toolCall.function.name],
  )

  const result = useMemo(() => {
    if (toolMessage) {
      return extractResponseFromMessage(toolMessage)
    }
    return 'Tool call result not found.'
  }, [toolMessage])

  const resultStatus = useMemo(() => {
    const lowerResult = result.toLowerCase()
    if (lowerResult.includes('error')) return 'error'
    if (lowerResult.includes('successfully')) return 'success'
    return 'neutral'
  }, [result])

  return { parsedArguments, toolInfo, result, resultStatus }
}

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

// Custom hook for scroll and overflow management
const useScrollManagement = (
  expandState: ReturnType<typeof useExpandState>,
  status: Status,
  result: string,
) => {
  const contentRef = useRef<HTMLDivElement>(null)
  const resultContentRef = useRef<HTMLDivElement>(null)

  const handleLineAdded = () => {
    const isRunning = status === 'pending' || status === 'running'
    if (contentRef.current && !expandState.isCollapsed && isRunning) {
      requestAnimationFrame(() => {
        if (contentRef.current) {
          const element = contentRef.current
          const { scrollHeight, clientHeight } = element
          if (scrollHeight > clientHeight) {
            element.scrollTop = element.scrollHeight
          }
        }
      })
    }
  }

  const handleArgumentsOverflow = (hasOverflow: boolean) => {
    expandState.setNeedsExpandButton(hasOverflow)
  }

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

  return {
    contentRef,
    resultContentRef,
    handleLineAdded,
    handleArgumentsOverflow,
  }
}

// Custom hook for event handlers
const useEventHandlers = (
  animationState: ReturnType<typeof useAnimationState>,
  expandState: ReturnType<typeof useExpandState>,
  onNavigate?: (tab: 'erd' | 'artifact') => void,
  toolInfo?: ReturnType<typeof useToolData>['toolInfo'],
) => {
  const handleArgumentsReady = () => {
    animationState.setArgumentsReady(true)
  }

  const handleToggle = () => {
    expandState.setIsCollapsed((prev) => !prev)
  }

  const handleToggleArgumentsExpand = () => {
    expandState.setIsArgumentsExpanded((prev) => !prev)
  }

  const handleToggleResultExpand = () => {
    expandState.setIsResultExpanded((prev) => !prev)
  }

  const handleNavigateClick = () => {
    if (onNavigate && toolInfo?.resultAction) {
      const tab = toolInfo.resultAction.type === 'erd' ? 'erd' : 'artifact'
      onNavigate(tab)
    }
  }

  return {
    handleArgumentsReady,
    handleToggle,
    handleToggleArgumentsExpand,
    handleToggleResultExpand,
    handleNavigateClick,
  }
}

// Component for expand/collapse button with tooltip
const ExpandButton: FC<{
  isExpanded: boolean
  onClick: () => void
  ariaLabel: { expanded: string; collapsed: string }
  className: string
}> = ({ isExpanded, onClick, ariaLabel, className }) => (
  <ArrowTooltipProvider>
    <ArrowTooltipRoot>
      <ArrowTooltipTrigger asChild>
        <button
          className={className}
          onClick={onClick}
          aria-label={isExpanded ? ariaLabel.expanded : ariaLabel.collapsed}
          type="button"
        >
          {isExpanded ? (
            <FoldVertical size={14} />
          ) : (
            <UnfoldVertical size={14} />
          )}
        </button>
      </ArrowTooltipTrigger>
      <ArrowTooltipPortal>
        <ArrowTooltipContent side="left" align="center">
          {isExpanded ? 'Collapse' : 'Expand'}
        </ArrowTooltipContent>
      </ArrowTooltipPortal>
    </ArrowTooltipRoot>
  </ArrowTooltipProvider>
)

// Component for header chevron icon
const ChevronIcon: FC<{ isCollapsed: boolean; isHovering: boolean }> = ({
  isCollapsed,
  isHovering,
}) => {
  const className = clsx(
    styles.chevron,
    !isHovering ? styles.chevronHidden : '',
  )
  return isCollapsed ? (
    <ChevronRight className={className} />
  ) : (
    <ChevronDown className={className} />
  )
}

export const ToolCallCard: FC<Props> = ({
  toolCall,
  status = 'completed',
  error,
  toolMessage,
  onNavigate,
}) => {
  const isPreCompleted = status === 'completed'
  const isRunning = status === 'pending' || status === 'running'

  // Use custom hooks
  const animationState = useAnimationState(status, isPreCompleted)
  const expandState = useExpandState(status, isPreCompleted)
  const { parsedArguments, toolInfo, result, resultStatus } = useToolData(
    toolCall,
    toolMessage,
  )
  const {
    contentRef,
    resultContentRef,
    handleLineAdded,
    handleArgumentsOverflow,
  } = useScrollManagement(expandState, status, result)
  const {
    handleArgumentsReady,
    handleToggle,
    handleToggleArgumentsExpand,
    handleToggleResultExpand,
    handleNavigateClick,
  } = useEventHandlers(animationState, expandState, onNavigate, toolInfo)

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
              <ChevronIcon
                isCollapsed={expandState.isCollapsed}
                isHovering={expandState.isHovering}
              />
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
                <ExpandButton
                  isExpanded={expandState.isArgumentsExpanded}
                  onClick={handleToggleArgumentsExpand}
                  ariaLabel={{
                    expanded: 'Collapse arguments',
                    collapsed: 'Expand arguments',
                  }}
                  className={styles.argumentsExpandButton}
                />
              )}
            </div>
            <ArgumentsDisplay
              args={parsedArguments}
              isAnimated={
                !isPreCompleted &&
                (animationState.animationStarted || isRunning)
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

          {/* Result display */}
          {(() => {
            const shouldShowResult =
              result &&
              status === 'completed' &&
              (isPreCompleted || animationState.argumentsAnimationComplete)
            if (!shouldShowResult) return null
            return (
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
                    <ExpandButton
                      isExpanded={expandState.isResultExpanded}
                      onClick={handleToggleResultExpand}
                      ariaLabel={{
                        expanded: 'Collapse result',
                        collapsed: 'Expand result',
                      }}
                      className={styles.resultExpandButton}
                    />
                  )}
                </div>
                <div className={styles.resultContentWrapper}>
                  {(() => {
                    const showGradients =
                      expandState.isResultScrollable &&
                      !expandState.isResultExpanded
                    if (!showGradients) return null
                    return (
                      <>
                        <div className={styles.resultGradientTop} />
                        <div className={styles.resultGradientBottom} />
                      </>
                    )
                  })()}
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
                      onClick={handleNavigateClick}
                    >
                      {toolInfo.resultAction.label}
                    </Button>
                  </div>
                )}
              </div>
            )
          })()}

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
