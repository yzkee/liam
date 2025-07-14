'use client'

import { ArrowRight, Check, ChevronDown, ChevronRight } from '@liam-hq/ui'
import clsx from 'clsx'
import { type FC, Fragment, useState } from 'react'
import type { StatusClass } from './VersionMessage'
import styles from './VersionMessage.module.css'

type Operation = {
  path: string[]
  status: string
  statusClass: StatusClass
}

type Props = {
  versionNumber: number
  operations: Operation[]
  initialExpanded?: boolean
}

export const VersionMessageDemo: FC<Props> = ({
  versionNumber,
  operations,
  initialExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded)

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <div className={clsx(styles.container, isExpanded && styles.expanded)}>
      <button
        type="button"
        className={clsx(styles.header, isExpanded && styles.expanded)}
        onClick={toggleExpanded}
      >
        <div className={styles.collapseButton}>
          {isExpanded ? <ChevronDown /> : <ChevronRight />}
        </div>
        <span className={styles.versionNumber}>Version {versionNumber}</span>
      </button>

      <div className={styles.divider} />
      <div
        className={clsx(styles.contentWrapper, isExpanded && styles.expanded)}
      >
        <div className={styles.content}>
          {operations.map((operation, index) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: Demo component
              key={index}
              className={clsx(
                styles.operationItem,
                styles[operation.statusClass],
              )}
            >
              <div className={styles.pathContainer}>
                {operation.path.map((part, partIndex) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: Demo component
                  <Fragment key={partIndex}>
                    {partIndex > 0 && (
                      <div className={styles.arrowContainer}>
                        <ArrowRight />
                      </div>
                    )}
                    <span className={styles.pathPart}>{part}</span>
                  </Fragment>
                ))}
              </div>
              <span
                className={clsx(
                  styles.operationStatus,
                  styles[operation.statusClass],
                )}
              >
                {operation.status}
              </span>
            </div>
          ))}
          {operations.length === 0 && (
            <div className={clsx(styles.operationItem, styles.statusGenerated)}>
              <div className={styles.pathContainer}>
                <div className={styles.generatedIcon}>
                  <Check />
                </div>
                <span className={styles.pathPart}>Schema updated</span>
              </div>
              <span
                className={clsx(styles.operationStatus, styles.statusGenerated)}
              >
                Generated
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
