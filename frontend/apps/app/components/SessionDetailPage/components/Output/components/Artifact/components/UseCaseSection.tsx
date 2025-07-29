'use client'

import type { UseCase } from '@liam-hq/artifact'
import {
  CollapsibleContent,
  CollapsibleRoot,
  CollapsibleTrigger,
} from '@liam-hq/ui'
import type { FC } from 'react'
import { useState } from 'react'
import { DmlOperationCard } from './DmlOperationCard'
import styles from './UseCaseSection.module.css'

type Props = {
  useCase: UseCase
  index: number
}

export const UseCaseSection: FC<Props> = ({ useCase, index }) => {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <CollapsibleRoot open={isExpanded} onOpenChange={setIsExpanded}>
      <div className={styles.container}>
        <CollapsibleTrigger className={styles.trigger}>
          <div className={styles.header}>
            <h4 className={styles.title}>
              {index + 1}. {useCase.title}
            </h4>
            <span className={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className={styles.content}>
          <p className={styles.description}>{useCase.description}</p>

          {useCase.dml_operations.length > 0 && (
            <div className={styles.operationsSection}>
              <h5 className={styles.operationsTitle}>DML Operations:</h5>
              <div className={styles.operationsGrid}>
                {useCase.dml_operations.map((operation, opIndex) => (
                  <DmlOperationCard
                    key={`${useCase.title}-${opIndex}`}
                    operation={operation}
                    index={opIndex}
                  />
                ))}
              </div>
            </div>
          )}
        </CollapsibleContent>
      </div>
    </CollapsibleRoot>
  )
}
