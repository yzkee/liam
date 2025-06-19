'use client'
import type { Schema } from '@liam-hq/db-structure'
import { schemaSchema } from '@liam-hq/db-structure'
import {
  type ComponentProps,
  type FC,
  useCallback,
  useEffect,
  useState,
  useTransition,
} from 'react'
import * as v from 'valibot'
import { Chat } from '../Chat'
import { Output } from './components/Output'
import {
  ARTIFACT_DOC,
  SCHEMA_UPDATES_DOC,
  SCHEMA_UPDATES_REVIEW_COMMENTS,
} from './mock'
import styles from './SessionDetailPage.module.css'
import {
  fetchSchemaDataClient,
  setupBuildingSchemaRealtimeSubscription,
} from './services/buildingSchemaServiceClient'

type Props = {
  designSession: ComponentProps<typeof Chat>['designSession']
}

export const SessionDetailPage: FC<Props> = ({ designSession }) => {
  const [schema, setSchema] = useState<Schema | null>(null)
  const [isLoadingSchema, startTransition] = useTransition()
  const [, setQuickFixMessage] = useState<string>('')
  const designSessionId = designSession.id

  const handleQuickFix = useCallback((comment: string) => {
    const fixMessage = `Please fix the following issue pointed out by the QA Agent:

"${comment}"

Please suggest a specific solution to resolve this problem.`
    setQuickFixMessage(fixMessage)
  }, [])

  // Load initial schema data
  useEffect(() => {
    const loadInitialSchema = async () => {
      startTransition(async () => {
        try {
          const { data: schemaData, error } =
            await fetchSchemaDataClient(designSessionId)

          if (error) {
            console.error('Failed to fetch initial schema:', error)
            return
          }

          if (schemaData.schema) {
            const schema = v.parse(schemaSchema, schemaData.schema)
            setSchema(schema)
          }
        } catch (error) {
          console.error('Error loading initial schema:', error)
        }
      })
    }

    if (designSessionId) {
      loadInitialSchema()
    }
  }, [designSessionId])

  // Handle schema updates from realtime subscription
  const handleSchemaUpdate = useCallback(
    async (triggeredDesignSessionId: string) => {
      try {
        const { data: schemaData, error } = await fetchSchemaDataClient(
          triggeredDesignSessionId,
        )

        if (error) {
          console.error('Failed to fetch updated schema:', error)
          return
        }

        if (schemaData.schema) {
          const schema = v.parse(schemaSchema, schemaData.schema)
          setSchema(schema)
        }
      } catch (error) {
        console.error('Error handling schema update:', error)
      }
    },
    [],
  )

  // Handle realtime subscription errors
  const handleRealtimeError = useCallback((_error: Error) => {
    // TODO: Add user notification system
    // console.error('Schema realtime subscription error:', error)
  }, [])

  // Set up realtime subscription for schema updates
  useEffect(() => {
    if (!designSessionId) {
      return
    }

    const subscription = setupBuildingSchemaRealtimeSubscription(
      designSessionId,
      handleSchemaUpdate,
      handleRealtimeError,
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [designSessionId, handleSchemaUpdate, handleRealtimeError])

  // Show loading state while schema is being fetched
  if (isLoadingSchema) {
    return <div>Loading schema...</div>
  }

  // Show error state if no schema is available
  if (!schema) {
    return <div>Failed to load schema</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.columns}>
        <div className={styles.chatSection}>
          <Chat schemaData={schema} designSession={designSession} />
        </div>
        <div className={styles.outputSection}>
          <Output
            schema={schema}
            schemaUpdatesDoc={SCHEMA_UPDATES_DOC}
            schemaUpdatesReviewComments={SCHEMA_UPDATES_REVIEW_COMMENTS}
            onQuickFix={handleQuickFix}
            artifactDoc={ARTIFACT_DOC}
          />
        </div>
      </div>
    </div>
  )
}
