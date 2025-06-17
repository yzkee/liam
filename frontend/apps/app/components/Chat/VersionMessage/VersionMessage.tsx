'use client'

import { createClient } from '@/libs/db/client'
import type { Json, Tables } from '@liam-hq/db'
import { type FC, useEffect, useState, useTransition } from 'react'
import * as v from 'valibot'
import styles from './VersionMessage.module.css'

/**
 * Parse JSON patch operations into human-readable format
 */
const parsePatchOperations = (patch: Json): string[] => {
  // The operationsSchema could not be imported as is.
  // The reason is probably that the `@liam-hq/agent` package also includes a node.js module
  // TODO: Modify to use operationsSchema.
  // const operations = v.parse(operationsSchema, patch)
  const operations = v.parse(
    v.array(
      v.object({
        op: v.string(),
        path: v.string(),
        value: v.any(),
      }),
    ),
    patch,
  )

  return operations.map((operation) => {
    const path = operation.path.replace(/^\//, '').replace(/\//g, ' → ')

    switch (operation.op) {
      case 'add':
        return `Added: ${path}`
      case 'remove':
        return `Removed: ${path}`
      case 'replace':
        return `Modified: ${path}`
      default:
        return `Unknown operation: ${path}`
    }
  })
}

type BuildingSchemaVersion = Pick<
  Tables<'building_schema_versions'>,
  'patch' | 'number' | 'id'
>

interface Props {
  buildingSchemaVersionId: string
}

export const VersionMessage: FC<Props> = ({ buildingSchemaVersionId }) => {
  const [version, setVersion] = useState<BuildingSchemaVersion | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('building_schema_versions')
        .select('id, number, patch')
        .eq('id', buildingSchemaVersionId)
        .single()

      if (error) {
        console.error('Failed to fetch version:', error)
        return
      }

      if (data) {
        setVersion(data)
      }
    })
  }, [buildingSchemaVersionId])

  if (isPending || !version) {
    return null
  }

  const displayVersionNumber = version.number
  const patchOperations = parsePatchOperations(version.patch)

  return (
    <div className={styles.container}>
      <div className={styles.iconContainer}>
        <div className={styles.versionIcon}>📊</div>
      </div>
      <div className={styles.contentContainer}>
        <div className={styles.header}>
          <span className={styles.title}>Schema Version</span>
          {displayVersionNumber && (
            <span className={styles.versionNumber}>
              v{displayVersionNumber}
            </span>
          )}
        </div>
        <div className={styles.messageWrapper}>
          <div className={styles.messageContent}>
            <div className={styles.messageText}>
              Schema updated to new version
            </div>

            {/* Display patch operations if available */}
            {patchOperations.length > 0 && (
              <div className={styles.patchContainer}>
                <div className={styles.patchTitle}>Schema Changes:</div>
                <ul className={styles.patchList}>
                  {patchOperations.map((operation, index) => (
                    <li
                      key={`${version.id}-${index}`}
                      className={styles.patchItem}
                    >
                      {operation}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
