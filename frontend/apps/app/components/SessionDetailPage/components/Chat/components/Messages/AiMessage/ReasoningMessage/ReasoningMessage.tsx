import { ChevronDown, ChevronRight } from '@liam-hq/ui'
import type { FC } from 'react'
import { useEffect, useState } from 'react'
import { MarkdownContent } from '../../../../../../../MarkdownContent'
import styles from './ReasoningMessage.module.css'

type Props = {
  content: string
  isWorkflowRunning?: boolean
}

export const ReasoningMessage: FC<Props> = ({
  content,
  isWorkflowRunning = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isContentStreaming, setIsContentStreaming] =
    useState(isWorkflowRunning)

  useEffect(() => {
    if (!isWorkflowRunning) {
      setIsContentStreaming(false)
      return
    }

    setIsContentStreaming(true)

    const timer = setTimeout(() => {
      setIsContentStreaming(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [isWorkflowRunning])

  const handleToggle = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={styles.header}
        onClick={handleToggle}
        aria-expanded={isExpanded}
      >
        <span className={styles.chevron}>
          {isExpanded ? <ChevronDown /> : <ChevronRight />}
        </span>
        <span className={styles.durationWrapper}>
          {isContentStreaming ? (
            <>
              <span className={styles.workedForText}>Reasoning</span>
              <span className={styles.dots}>
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.dot} />
              </span>
            </>
          ) : (
            <span className={styles.workedForText}>Reasoning finished</span>
          )}
        </span>
      </button>
      {isExpanded && (
        <div className={styles.content}>
          <MarkdownContent content={content} />
        </div>
      )}
    </div>
  )
}
