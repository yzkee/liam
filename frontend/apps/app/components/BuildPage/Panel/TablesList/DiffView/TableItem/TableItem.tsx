import type {
  SchemaDiffItem,
  Table,
  TableRelatedDiffItem,
} from '@liam-hq/db-structure'
import clsx from 'clsx'
import type { FC } from 'react'
import { match } from 'ts-pattern'
import { ColumnItem } from './ColumnItem'
import diffStyles from './Diff.module.css'
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
}

export const TableItem: FC<Props> = ({ table, diffItems, type }) => {
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

      <div className={styles.columnSection}>
        {Object.values(table.columns).map((column) => (
          <ColumnItem
            key={column.name}
            tableId={table.name}
            column={column}
            diffItems={diffItems}
            type={type}
          />
        ))}
      </div>
    </section>
  )
}
