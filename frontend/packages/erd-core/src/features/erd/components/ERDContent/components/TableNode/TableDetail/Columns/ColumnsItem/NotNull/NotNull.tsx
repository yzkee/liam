import type { Column } from '@liam-hq/db-structure'
import {
  DiamondFillIcon,
  DiamondIcon,
  GridTableItem,
  GridTableRow,
} from '@liam-hq/ui'
import { type FC, useMemo } from 'react'
import { useDiffStyle } from '@/features/diff/hooks/useDiffStyle'
import { useSchemaOrThrow, useUserEditingOrThrow } from '@/stores'
import { getChangeStatus } from './getChangeStatus'
import styles from './NotNull.module.css'

type Props = {
  tableId: string
  column: Column
}

export const NotNull: FC<Props> = ({ tableId, column }) => {
  const { diffItems } = useSchemaOrThrow()
  const { showDiff } = useUserEditingOrThrow()

  const changeStatus = useMemo(() => {
    if (!showDiff) return undefined
    return getChangeStatus({
      tableId,
      columnId: column.name,
      diffItems: diffItems ?? [],
    })
  }, [showDiff, tableId, diffItems, column.name])

  const diffStyle = useDiffStyle(showDiff, changeStatus)

  return (
    <GridTableItem className={diffStyle}>
      <GridTableRow>
        {column.notNull ? (
          <>
            <DiamondFillIcon className={styles.diamondIcon} />
            Not-null
          </>
        ) : (
          <>
            <DiamondIcon className={styles.diamondIcon} />
            Nullable
          </>
        )}
      </GridTableRow>
    </GridTableItem>
  )
}
