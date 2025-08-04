import type { PrimaryKeyConstraint } from '@liam-hq/db-structure'
import { GridTableRoot } from '@liam-hq/ui'
import { type FC, useMemo } from 'react'
import { useDiffStyle } from '@/features/diff/hooks/useDiffStyle'
import { useSchemaOrThrow, useUserEditingOrThrow } from '@/stores'
import { Columns } from './Columns'
import { getChangeStatus } from './getChangeStatus'
import { Name } from './Name'

type Props = {
  tableId: string
  primaryKeyConstraint: PrimaryKeyConstraint
}

export const PrimaryKeyConstraintsItem: FC<Props> = ({
  tableId,
  primaryKeyConstraint,
}) => {
  const { diffItems } = useSchemaOrThrow()
  const { showDiff } = useUserEditingOrThrow()

  const changeStatus = useMemo(() => {
    if (!showDiff) return undefined
    return getChangeStatus({
      tableId,
      diffItems: diffItems ?? [],
      constraintId: primaryKeyConstraint.name,
    })
  }, [showDiff, tableId, diffItems, primaryKeyConstraint.name])

  const diffStyle = useDiffStyle(showDiff, changeStatus)

  return (
    <div className={diffStyle}>
      <GridTableRoot>
        <Name tableId={tableId} constraint={primaryKeyConstraint} />
        <Columns tableId={tableId} constraint={primaryKeyConstraint} />
      </GridTableRoot>
    </div>
  )
}
