import type { Schema } from '@liam-hq/schema'
import { useMemo } from 'react'
import { schemaToDdl } from '../utils/schemaToDdl'

type Props = {
  currentSchema: Schema | null
  baselineSchema: Schema | null
}

type Result = {
  cumulativeDdl: string
  prevCumulativeDdl: string
}

export const useDdl = ({ currentSchema, baselineSchema }: Props): Result => {
  const cumulativeDdl = useMemo(() => {
    if (!currentSchema) return ''
    const result = schemaToDdl(currentSchema)
    return result.ddl
  }, [currentSchema])

  const prevCumulativeDdl = useMemo(() => {
    if (!baselineSchema) return ''
    const result = schemaToDdl(baselineSchema)
    return result.ddl
  }, [baselineSchema])

  return {
    cumulativeDdl,
    prevCumulativeDdl,
  }
}
