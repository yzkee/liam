import type { Index } from '@liam-hq/schema'
import { GridTableHeader } from '@liam-hq/ui'
import { type FC, useMemo } from 'react'
import { useDiffStyle } from '@/features/diff/hooks/useDiffStyle'
import { useSchemaOrThrow, useUserEditingOrThrow } from '@/stores'
import { getChangeStatus } from './getChangeStatus'

type Props = {
  tableId: string
  index: Index
}

export const Name: FC<Props> = ({ tableId, index }) => {
  const { diffItems } = useSchemaOrThrow()
  const { showDiff } = useUserEditingOrThrow()

  const changeStatus = useMemo(() => {
    if (!showDiff) return undefined
    return getChangeStatus({
      tableId,
      diffItems: diffItems ?? [],
      indexId: index.name,
    })
  }, [showDiff, tableId, diffItems])

  const diffStyle = useDiffStyle(showDiff, changeStatus)

  return <GridTableHeader className={diffStyle}>{index.name}</GridTableHeader>
}
