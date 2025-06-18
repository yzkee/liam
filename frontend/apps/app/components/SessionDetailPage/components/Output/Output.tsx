import { TabsContent, TabsRoot } from '@/components'
import type { Schema } from '@liam-hq/db-structure'
import type { FC } from 'react'
import type { ReviewComment } from '../../types'
import styles from './Output.module.css'
import { Artifact } from './components/Artifact'
import { ERD } from './components/ERD'
import { Header } from './components/Header'
import { SchemaUpdates } from './components/SchemaUpdates'
import { DEFAULT_OUTPUT_TAB, OUTPUT_TABS } from './constants'

type Props = {
  schema: Schema
  schemaUpdatesDoc: string
  schemaUpdatesReviewComments: ReviewComment[]
  onQuickFix?: (comment: string) => void
  artifactDoc: string
}

export const Output: FC<Props> = ({
  schema,
  schemaUpdatesDoc,
  schemaUpdatesReviewComments,
  onQuickFix,
  artifactDoc,
}) => {
  return (
    <TabsRoot defaultValue={DEFAULT_OUTPUT_TAB} className={styles.tabsRoot}>
      <Header />
      <TabsContent value={OUTPUT_TABS.ERD} className={styles.tabsContent}>
        <ERD schema={schema} />
      </TabsContent>
      <TabsContent
        value={OUTPUT_TABS.SCHEMA_UPDATES}
        className={styles.tabsContent}
      >
        <SchemaUpdates
          doc={schemaUpdatesDoc}
          comments={schemaUpdatesReviewComments}
          onQuickFix={onQuickFix}
        />
      </TabsContent>
      <TabsContent value={OUTPUT_TABS.ARTIFACT} className={styles.tabsContent}>
        <Artifact doc={artifactDoc} />
      </TabsContent>
    </TabsRoot>
  )
}
