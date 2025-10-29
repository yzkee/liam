'use client'

import type { Schema } from '@liam-hq/schema'
import type { FC } from 'react'
import type { ReviewComment } from '../../../../types'
import { CopyButton } from '../../../CopyButton'
import { useDdl } from './hooks/useDdl'
import styles from './Migrations.module.css'
import { MigrationsViewer } from './MigrationsViewer'

type Props = {
  currentSchema: Schema
  baselineSchema: Schema
  comments?: ReviewComment[]
}

export const Migrations: FC<Props> = ({
  currentSchema,
  baselineSchema,
  comments = [],
}) => {
  const { cumulativeDdl, prevCumulativeDdl } = useDdl({
    currentSchema,
    baselineSchema,
  })

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <CopyButton
          textToCopy={cumulativeDdl}
          tooltipLabel="Copy Migration Diff"
        />
      </div>
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
