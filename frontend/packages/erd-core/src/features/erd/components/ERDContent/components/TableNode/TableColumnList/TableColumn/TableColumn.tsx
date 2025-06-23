import type {
  Cardinality as CardinalityType,
  Column,
  Table,
} from '@liam-hq/db-structure'
import { DiamondFillIcon, DiamondIcon, KeyRound, Link } from '@liam-hq/ui'
import { Handle, Position } from '@xyflow/react'
import clsx from 'clsx'
import { type FC, useMemo } from 'react'
import { match } from 'ts-pattern'
import { DiffIcon } from '@/features/diff/components/DiffIcon'
import diffStyles from '@/features/diff/styles/Diff.module.css'
import { useSchema, useUserEditing } from '@/stores'
import { getChangeStatus } from './getChangeStatus'
import styles from './TableColumn.module.css'

type TableColumnProps = {
  table: Table
  column: Column
  handleId: string
  isSource: boolean
  targetCardinality?: CardinalityType | undefined
  isHighlightedTable?: boolean
}

type ColumnIconProps = {
  column: Column
  isSource: boolean
  targetCardinality?: CardinalityType | undefined
}

const ColumnIcon: FC<ColumnIconProps> = ({
  column,
  isSource,
  targetCardinality,
}) => {
  if (column.primary) {
    return (
      <KeyRound
        width={16}
        height={16}
        className={styles.primaryKeyIcon}
        role="img"
        aria-label="Primary Key"
        strokeWidth={1.5}
      />
    )
  }

  if (isSource || targetCardinality) {
    return (
      <Link
        width={16}
        height={16}
        className={styles.linkIcon}
        role="img"
        aria-label="Foreign Key"
        strokeWidth={1.5}
      />
    )
  }

  if (column.notNull) {
    return (
      <DiamondFillIcon
        width={16}
        height={16}
        className={styles.diamondIcon}
        role="img"
        aria-label="Not Null"
      />
    )
  }

  return (
    <DiamondIcon
      width={16}
      height={16}
      className={styles.diamondIcon}
      role="img"
      aria-label="Nullable"
    />
  )
}

export const TableColumn: FC<TableColumnProps> = ({
  table,
  column,
  handleId,
  isSource,
  targetCardinality,
  isHighlightedTable,
}) => {
  const { diffItems } = useSchema()
  const { showDiff } = useUserEditing()

  const changeStatus = getChangeStatus({
    tableId: table.name,
    columnId: column.name,
    diffItems: diffItems ?? [],
  })

  const diffStyle = useMemo(
    () =>
      match(changeStatus)
        .with('added', () => diffStyles.addedBg)
        .with('removed', () => diffStyles.removedBg)
        .with('modified', () => diffStyles.modifiedBg)
        .otherwise(() => undefined),
    [changeStatus],
  )

  const shouldHighlight =
    isHighlightedTable && (isSource || !!targetCardinality)

  return (
    <li className={clsx(styles.wrapper, showDiff && styles.wrapperWithDiff)}>
      {showDiff && (
        <div className={clsx(styles.diffBox, diffStyle)}>
          <DiffIcon changeStatus={changeStatus} />
        </div>
      )}

      <div
        key={column.name}
        className={clsx(
          styles.columnWrapper,
          shouldHighlight && styles.highlightRelatedColumn,
          showDiff && diffStyle,
        )}
      >
        <ColumnIcon
          column={column}
          isSource={isSource}
          targetCardinality={targetCardinality}
        />

        <span className={styles.columnNameWrapper}>
          <span>{column.name}</span>
          <span className={styles.columnType}>{column.type}</span>
        </span>

        {isSource && (
          <Handle
            id={handleId}
            type="source"
            position={Position.Right}
            className={styles.handle}
          />
        )}

        {targetCardinality && (
          <Handle
            id={handleId}
            type="target"
            position={Position.Left}
            className={styles.handle}
          />
        )}
      </div>
    </li>
  )
}
