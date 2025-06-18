'use client'

import { IconButton } from '@/components'
import type { ReviewComment } from '@/components/SessionDetailPage/types'
import clsx from 'clsx'
import { MessageSquareCode } from 'lucide-react'
import { type FC, useState } from 'react'
import { MigrationsViewer } from './MigrationsViewer'
import styles from './SchemaUpdates.module.css'

type Props = {
  doc: string
  comments: ReviewComment[]
  onQuickFix?: (comment: string) => void
}

export const SchemaUpdates: FC<Props> = ({ doc, comments, onQuickFix }) => {
  const [showReviewComments, setShowReviewComments] = useState(true)

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <IconButton
          icon={
            <MessageSquareCode
              className={clsx(showReviewComments && styles.active)}
            />
          }
          tooltipContent="Migration Review"
          onClick={() => setShowReviewComments((prev) => !prev)}
        />
      </div>
      <div className={styles.body}>
        <MigrationsViewer
          showDiff
          doc={doc}
          comments={comments}
          showComments={showReviewComments}
          onQuickFix={onQuickFix}
        />
      </div>
    </section>
  )
}
