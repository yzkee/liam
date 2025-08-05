import { type Column, type Constraints, isPrimaryKey } from '@liam-hq/schema'
import { GridTableRoot } from '@liam-hq/ui'
import clsx from 'clsx'
import { type FC, useMemo } from 'react'
import { useDiffStyle } from '@/features/diff/hooks/useDiffStyle'
import { useSchemaOrThrow, useUserEditingOrThrow } from '@/stores'
import styles from './ColumnsItem.module.css'
import { Comment } from './Comment'
import { Default } from './Default'
import { getChangeStatus } from './getChangeStatus'
import { NotNull } from './NotNull'
import { PrimaryKey } from './PrimaryKey'
import { Type } from './Type'

type Props = {
  tableId: string
  column: Column
  constraints: Constraints
}

export const ColumnsItem: FC<Props> = ({ tableId, column, constraints }) => {
  const { diffItems } = useSchemaOrThrow()
  const { showDiff } = useUserEditingOrThrow()

  const changeStatus = useMemo(() => {
    if (!showDiff) return undefined
    return getChangeStatus({
      tableId,
      diffItems: diffItems ?? [],
      columnId: column.name,
    })
  }, [showDiff, tableId, diffItems])

  const diffStyle = useDiffStyle(showDiff, changeStatus)

  return (
    <div className={clsx(styles.wrapper, diffStyle)}>
      <h3 className={styles.heading}>{column.name}</h3>
      {column.comment && <Comment tableId={tableId} column={column} />}
      <GridTableRoot>
        <Type tableId={tableId} column={column} />
        <Default tableId={tableId} column={column} />
        {isPrimaryKey(column.name, constraints) && (
          <PrimaryKey tableId={tableId} columnName={column.name} />
        )}
        <NotNull tableId={tableId} column={column} />
      </GridTableRoot>
    </div>
  )
}
