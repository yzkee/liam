import type { Schema } from '@liam-hq/db-structure'
import { useMemo } from 'react'
import { generateDiffDdl, schemaToDdl } from '../utils/schemaToDdl'

type UseSchemaUpdatesProps = {
  currentSchema: Schema | null
  prevSchema: Schema | null
}

type UseSchemaUpdatesResult = {
  cumulativeDdl: string
  prevCumulativeDdl: string
  diffDdl: string
}

export const useSchemaUpdates = ({
  currentSchema,
  prevSchema,
}: UseSchemaUpdatesProps): UseSchemaUpdatesResult => {
  // Generate DDL from schemas
  const cumulativeDdl = useMemo(() => {
    if (!currentSchema) return ''
    const result = schemaToDdl(currentSchema)
    return result.ddl
  }, [currentSchema])

  const prevCumulativeDdl = useMemo(() => {
    if (!prevSchema) return ''
    const result = schemaToDdl(prevSchema)
    return result.ddl
  }, [prevSchema])

  const diffDdl = useMemo(() => {
    if (!currentSchema || !prevSchema) return ''
    const result = generateDiffDdl(currentSchema, prevSchema)
    return result.ddl
  }, [currentSchema, prevSchema])

  return {
    cumulativeDdl,
    prevCumulativeDdl,
    diffDdl,
  }
}
