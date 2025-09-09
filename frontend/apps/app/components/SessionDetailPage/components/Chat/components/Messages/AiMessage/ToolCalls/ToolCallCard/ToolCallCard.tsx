'use client'

import type { ToolMessage as ToolMessageType } from '@langchain/core/messages'
import {
  ArrowTooltipContent,
  ArrowTooltipPortal,
  ArrowTooltipProvider,
  ArrowTooltipRoot,
  ArrowTooltipTrigger,
  ChevronDown,
  ChevronRight,
  FoldVertical,
  UnfoldVertical,
  Wrench,
  Check,
  X,
} from '@liam-hq/ui'
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
}

export const ToolCallCard: FC<Props> = ({
  toolCall,
  status = 'completed',
  error,
  toolMessage,
}) => {
  // Determine if this is a pre-completed tool (no animation needed)
  const isPreCompleted = status === 'completed'
  
  // Track if arguments are ready to display
  // Always start as true so arguments are visible
  const [argumentsReady, setArgumentsReady] = useState(true)
  
  // Track if animation was started (to prevent interruption)
  const [animationStarted, setAnimationStarted] = useState(false)
  
  // Track if arguments animation is complete
  const [argumentsAnimationComplete, setArgumentsAnimationComplete] = useState(isPreCompleted)
  
  // Dynamic state management based on status
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Always start collapsed for completed tools
    return isPreCompleted
  })
  // const [hasBeenRunning, setHasBeenRunning] = useState(false) // Unused after disabling RESULT scroll
  const [isHovering, setIsHovering] = useState(false)
  
  // Expand/collapse state for arguments
  const [isArgumentsExpanded, setIsArgumentsExpanded] = useState(false)
  const [needsExpandButton, setNeedsExpandButton] = useState(false)
  
  // Expand/collapse state for result
  const [isResultExpanded, setIsResultExpanded] = useState(false)
  const [needsResultExpandButton, setNeedsResultExpandButton] = useState(false)
  const [isResultScrollable, setIsResultScrollable] = useState(false)
  const resultContentRef = useRef<HTMLDivElement>(null)
  
  // Scroll management for content area
  const contentRef = useRef<HTMLDivElement>(null)

  // Ensure it's expanded when running or pending
  useEffect(() => {
    // If pending or running, expand the card and start animation
    if (status === 'pending' || status === 'running') {
      // setHasBeenRunning(true) // Unused after disabling RESULT scroll
      // Ensure it's expanded when pending/running
      setIsCollapsed(false)
      // Mark that animation has started
      setAnimationStarted(true)
      // For pending/running, arguments should be visible but animating
      // Don't set argumentsReady to false as it controls visibility
      setArgumentsAnimationComplete(false)
    } else if (status === 'completed' && !animationStarted && !isPreCompleted) {
      // If completed without running state (but wasn't pre-completed), 
      // treat as if it ran instantly
      setArgumentsReady(true)
      setArgumentsAnimationComplete(true)
      setIsCollapsed(false) // Show expanded for instant completion
    }
    // If isPreCompleted, keep initial collapsed state
  }, [status, animationStarted, isPreCompleted])

  const parsedArguments = useMemo(
    () => parseToolArguments(toolCall.function.arguments),
    [toolCall.function.arguments],
  )
  
  const toolInfo = useMemo(
    () => getToolDisplayInfo(toolCall.function.name),
    [toolCall.function.name],
  )
  
  // Extract result from toolMessage if available
  const result = useMemo(
    () => {
      if (toolMessage) {
        return extractResponseFromMessage(toolMessage)
      }
      return 'Tool call result not found.'
    },
    [toolMessage, toolCall],
  )
  
  // Check result status
  const resultStatus = useMemo(() => {
    const lowerResult = result.toLowerCase()
    if (lowerResult.includes('error')) return 'error'
    if (lowerResult.includes('successfully')) return 'success'
    return 'neutral'
  }, [result])

  // Auto-expand when pending or running (for streaming tools)
  useEffect(() => {
    if (status === 'pending' || status === 'running') {
      setIsCollapsed(false)
    }
  }, [status])

  // Scroll to show RESULT when completed - DISABLED
  // NOTE: We don't need to scroll to RESULT, just keep the final ARGUMENTS position
  /*
  useEffect(() => {
    if (status === 'completed' && hasBeenRunning && result) {
      // Small delay to ensure RESULT is rendered
      setTimeout(() => {
        // Find the RESULT element and scroll it into view
        const resultElement = document.querySelector(`[data-tool-id="${toolCall.id}"] .${styles.result}`)
        if (resultElement) {
          resultElement.scrollIntoView({ behavior: 'smooth', block: 'end' })
        }
      }, 100)
    }
  }, [status, hasBeenRunning, result, toolCall.id])
  */
  
  // Notify when arguments are ready
  const handleArgumentsReady = () => {
    setArgumentsReady(true)
  }

  const handleToggle = () => {
    setIsCollapsed((prev) => !prev)
  }

  const isRunning = status === 'pending' || status === 'running'

  // Handler for when a line is added in ArgumentsDisplay
  const handleLineAdded = () => {
    if (contentRef.current && !isCollapsed && isRunning) {
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
    // Show expand button when there's overflow, regardless of status
    // This allows users to collapse/expand during running state as well
    setNeedsExpandButton(hasOverflow)
  }
  
  // Toggle arguments expand/collapse
  const handleToggleArgumentsExpand = () => {
    setIsArgumentsExpanded(prev => !prev)
  }
  
  // Toggle result expand/collapse
  const handleToggleResultExpand = () => {
    setIsResultExpanded(prev => !prev)
  }
  
  // Check if result needs expand button and is scrollable
  useEffect(() => {
    if (resultContentRef.current && result && status === 'completed') {
      const element = resultContentRef.current
      // Check if content exceeds max-height (100px)
      const hasOverflow = element.scrollHeight > 100
      setNeedsResultExpandButton(hasOverflow)
      setIsResultScrollable(hasOverflow && !isResultExpanded)
    }
  }, [result, status, isResultExpanded])

  return (
    <div
      className={styles.container}
      data-status={status}
      data-collapsed={isCollapsed}
    >
      <button
        type="button"
        className={styles.header}
        onClick={handleToggle}
        aria-expanded={!isCollapsed}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <div className={styles.iconWrapper}>
              <Wrench className={`${styles.icon} ${isHovering ? styles.iconHidden : ''} ${isRunning ? styles.iconAnimated : ''}`} />
              {isCollapsed ? (
                <ChevronRight className={`${styles.chevron} ${!isHovering ? styles.chevronHidden : ''}`} />
              ) : (
                <ChevronDown className={`${styles.chevron} ${!isHovering ? styles.chevronHidden : ''}`} />
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
          <div className={styles.arguments} style={{ visibility: argumentsReady ? 'visible' : 'hidden' }}>
            <div className={styles.argumentsHeader}>
              <span className={styles.argumentsTitle}>ARGUMENTS</span>
              {needsExpandButton && (
                <ArrowTooltipProvider>
                  <ArrowTooltipRoot>
                    <ArrowTooltipTrigger asChild>
                      <button
                        className={styles.argumentsExpandButton}
                        onClick={handleToggleArgumentsExpand}
                        aria-label={isArgumentsExpanded ? 'Collapse arguments' : 'Expand arguments'}
                        type="button"
                      >
                        {isArgumentsExpanded ? <FoldVertical size={14} /> : <UnfoldVertical size={14} />}
                      </button>
                    </ArrowTooltipTrigger>
                    <ArrowTooltipPortal>
                      <ArrowTooltipContent side="left" align="center">
                        {isArgumentsExpanded ? 'Collapse' : 'Expand'}
                      </ArrowTooltipContent>
                    </ArrowTooltipPortal>
                  </ArrowTooltipRoot>
                </ArrowTooltipProvider>
              )}
            </div>
            <ArgumentsDisplay
              args={parsedArguments}
              isAnimated={!isPreCompleted && (animationStarted || status === 'pending' || status === 'running')}
              onLineAdded={handleLineAdded}
              onReady={handleArgumentsReady}
              isExpanded={isArgumentsExpanded}
              onOverflowDetected={handleArgumentsOverflow}
              toolName={toolCall.function.name}
              onAnimationComplete={() => setArgumentsAnimationComplete(true)}
            />
          </div>

          {/* Result display - shown after arguments animation completes or for pre-completed tools */}
          {result && status === 'completed' && (isPreCompleted || argumentsAnimationComplete) && (
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
                {needsResultExpandButton && (
                  <ArrowTooltipProvider>
                    <ArrowTooltipRoot>
                      <ArrowTooltipTrigger asChild>
                        <button
                          className={styles.resultExpandButton}
                          onClick={handleToggleResultExpand}
                          aria-label={isResultExpanded ? 'Collapse result' : 'Expand result'}
                          type="button"
                        >
                          {isResultExpanded ? <FoldVertical size={14} /> : <UnfoldVertical size={14} />}
                        </button>
                      </ArrowTooltipTrigger>
                      <ArrowTooltipPortal>
                        <ArrowTooltipContent side="left" align="center">
                          {isResultExpanded ? 'Collapse' : 'Expand'}
                        </ArrowTooltipContent>
                      </ArrowTooltipPortal>
                    </ArrowTooltipRoot>
                  </ArrowTooltipProvider>
                )}
              </div>
              <div className={styles.resultContentWrapper}>
                {isResultScrollable && !isResultExpanded && (
                  <>
                    <div className={styles.resultGradientTop} />
                    <div className={styles.resultGradientBottom} />
                  </>
                )}
                <div 
                  className={styles.resultContent} 
                  ref={resultContentRef}
                  data-expanded={isResultExpanded}
                >
                  <div className={styles.resultMessage}>
                    <span>{result}</span>
                  </div>
                </div>
              </div>
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
