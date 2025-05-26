import {
  CollapsibleContent,
  CollapsibleRoot,
  CollapsibleTrigger,
} from '@/components'
import type {
  SchemaDiffItem,
  Table,
  TableRelatedDiffItem,
} from '@liam-hq/db-structure'
import clsx from 'clsx'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { FC } from 'react'
import { match } from 'ts-pattern'
import { ColumnItem } from './ColumnItem'
import { ConstraintList } from './ConstraintList'
import diffStyles from './Diff.module.css'
import { IndexItem } from './IndexItem'
import styles from './TableItem.module.css'

function getChangeStatusStyle(
  tableId: string,
  diffItems: SchemaDiffItem[],
  kind: TableRelatedDiffItem['kind'],
  type: 'before' | 'after',
) {
  const status =
    diffItems.find((item) => item.kind === kind && item.tableId === tableId)
      ?.status ?? 'unchanged'

  return match([status, type])
    .with(['added', 'after'], () => diffStyles.added)
    .with(['modified', 'after'], () => diffStyles.added)
    .with(['removed', 'before'], () => diffStyles.removed)
    .with(['modified', 'before'], () => diffStyles.removed)
    .otherwise(() => '')
}

type Props = {
  table: Table
  diffItems: SchemaDiffItem[]
  type: 'before' | 'after'
  isOpenColumns: boolean
  isOpenIndex: boolean
  isOpenConstraint: boolean
  onOpenChangeColumns: (open: boolean) => void
  onOpenChangeIndex: (open: boolean) => void
  onOpenChangeConstraint: (open: boolean) => void
}

export const TableItem: FC<Props> = ({
  table,
  diffItems,
  type,
  isOpenColumns,
  isOpenIndex,
  isOpenConstraint,
  onOpenChangeColumns,
  onOpenChangeIndex,
  onOpenChangeConstraint,
}) => {
  const tableStatusStyle = getChangeStatusStyle(
    table.name,
    diffItems,
    'table',
    type,
  )
  const tableNameStatusStyle = getChangeStatusStyle(
    table.name,
    diffItems,
    'table-name',
    type,
  )
  const tableCommentStatusStyle = getChangeStatusStyle(
    table.name,
    diffItems,
    'table-comment',
    type,
  )

  return (
    <section
      className={clsx(
        styles.tableSection,
        tableStatusStyle,
        type === 'after' && styles.after,
        type === 'before' && styles.before,
      )}
    >
      <h1 className={tableNameStatusStyle}>{table.name}</h1>
      <div className={styles.commentSection}>
        <p className={tableCommentStatusStyle}>{table.comment}</p>
      </div>

      <hr className={styles.divider} />

      <CollapsibleRoot
        className={styles.root}
        open={isOpenColumns}
        onOpenChange={onOpenChangeColumns}
      >
        <CollapsibleTrigger className={styles.trigger}>
          <h2>Columns</h2>
          {isOpenColumns ? (
            <ChevronUp className={styles.triggerIcon} />
          ) : (
            <ChevronDown className={styles.triggerIcon} />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          {Object.values(table.columns).map((column) => (
            <ColumnItem
              key={column.name}
              tableId={table.name}
              column={column}
              diffItems={diffItems}
              type={type}
            />
          ))}
        </CollapsibleContent>
      </CollapsibleRoot>

      <hr className={styles.divider} />

      <CollapsibleRoot
        className={styles.root}
        open={isOpenIndex}
        onOpenChange={onOpenChangeIndex}
      >
        <CollapsibleTrigger className={styles.trigger}>
          <h2>Index</h2>
          {isOpenIndex ? (
            <ChevronUp className={styles.triggerIcon} />
          ) : (
            <ChevronDown className={styles.triggerIcon} />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          {Object.values(table.indexes).map((index) => (
            <IndexItem
              key={index.name}
              tableId={table.name}
              index={index}
              diffItems={diffItems}
              type={type}
            />
          ))}
        </CollapsibleContent>
      </CollapsibleRoot>

      <hr className={styles.divider} />

      <ConstraintList
        constraints={table.constraints}
        tableId={table.name}
        type={type}
        diffItems={diffItems}
        open={isOpenConstraint}
        onOpenChange={onOpenChangeConstraint}
      />
    </section>
  )
}
