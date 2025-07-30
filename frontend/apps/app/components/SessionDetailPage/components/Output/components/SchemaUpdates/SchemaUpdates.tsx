'use client'

import type { Schema } from '@liam-hq/db-structure'
import type { FC } from 'react'
import type { ReviewComment } from '@/components/SessionDetailPage/types'
import { useSchemaUpdates } from './hooks/useSchemaUpdates'
import { MigrationsViewer } from './MigrationsViewer'
import styles from './SchemaUpdates.module.css'

type Props = {
  currentSchema: Schema
  prevSchema: Schema
  comments?: ReviewComment[]
}

export const SchemaUpdates: FC<Props> = ({
  currentSchema,
  prevSchema,
  comments = [],
}) => {
  const { cumulativeDdl, prevCumulativeDdl } = useSchemaUpdates({
    currentSchema,
    prevSchema,
  })

  return (
    <section className={styles.section}>
      <div className={styles.body}>
        <MigrationsViewer
          showDiff
          doc={cumulativeDdl}
          prevDoc={prevCumulativeDdl}
          comments={comments}
          showComments={false}
        />
      </div>
    </section>
  )
}
