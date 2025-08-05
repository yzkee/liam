import type { UniqueConstraint } from '@liam-hq/db-structure'
import { GridTableRoot } from '@liam-hq/ui'
import { type FC, useMemo } from 'react'
import { useDiffStyle } from '@/features/diff/hooks/useDiffStyle'
import { useSchemaOrThrow, useUserEditingOrThrow } from '@/stores'
import { Columns } from './Columns'
import { getChangeStatus } from './getChangeStatus'
import { Name } from './Name'

type Props = {
  tableId: string
  uniqueConstraint: UniqueConstraint
}

export const UniqueConstraintsItem: FC<Props> = ({
  tableId,
  uniqueConstraint,
}) => {
  const { diffItems } = useSchemaOrThrow()
  const { showDiff } = useUserEditingOrThrow()

  const changeStatus = useMemo(() => {
    if (!showDiff) return undefined
    return getChangeStatus({
      tableId,
      diffItems: diffItems ?? [],
      constraintId: uniqueConstraint.name,
    })
  }, [showDiff, tableId, diffItems, uniqueConstraint.name])

  const diffStyle = useDiffStyle(showDiff, changeStatus)

  return (
    <div className={diffStyle}>
      <GridTableRoot>
        <Name tableId={tableId} constraint={uniqueConstraint} />
        <Columns tableId={tableId} constraint={uniqueConstraint} />
      </GridTableRoot>
    </div>
  )
}
