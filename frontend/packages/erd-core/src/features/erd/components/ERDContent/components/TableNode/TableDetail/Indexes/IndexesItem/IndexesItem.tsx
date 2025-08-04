import type { Index } from '@liam-hq/db-structure'
import {
  GridTableDd,
  GridTableDt,
  GridTableItem,
  GridTableRoot,
} from '@liam-hq/ui'
import clsx from 'clsx'
import { type FC, useMemo } from 'react'
import { useDiffStyle } from '@/features/diff/hooks/useDiffStyle'
import { useSchemaOrThrow, useUserEditingOrThrow } from '@/stores'
import { getChangeStatus } from './getChangeStatus'
import styles from './IndexesItem.module.css'
import { Name } from './Name'

type Props = {
  tableId: string
  index: Index
}

export const IndexesItem: FC<Props> = ({ tableId, index }) => {
  const HIDE_INDEX_TYPE = 'btree'
  const { diffItems } = useSchemaOrThrow()
  const { showDiff } = useUserEditingOrThrow()

  const changeStatus = useMemo(() => {
    if (!showDiff) return undefined
    return getChangeStatus({
      tableId,
      diffItems: diffItems ?? [],
      indexId: index.name,
    })
  }, [showDiff, tableId, diffItems, index.name])

  const diffStyle = useDiffStyle(showDiff, changeStatus)

  return (
    <div className={clsx(styles.wrapper, diffStyle)}>
      <GridTableRoot>
        <Name tableId={tableId} index={index} />
        {index.type && index.type.toLowerCase() !== HIDE_INDEX_TYPE && (
          <GridTableItem>
            <GridTableDt>Type</GridTableDt>
            <GridTableDd>{index.type}</GridTableDd>
          </GridTableItem>
        )}
        {!!index.columns.length && (
          <GridTableItem>
            <GridTableDt>
              {index.columns.length === 1 ? 'Column' : 'Columns'}
            </GridTableDt>
            <GridTableDd>
              {index.columns.length === 1 ? (
                index.columns[0]
              ) : (
                <ol className={styles.list}>
                  {index.columns.map((column) => (
                    <li key={column}>{column}</li>
                  ))}
                </ol>
              )}
            </GridTableDd>
          </GridTableItem>
        )}
        <GridTableItem>
          <GridTableDt>Unique</GridTableDt>
          <GridTableDd>{index.unique ? 'Yes' : 'No'}</GridTableDd>
        </GridTableItem>
      </GridTableRoot>
    </div>
  )
}
