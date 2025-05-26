import type { SchemaDiffItem, Table } from '@liam-hq/db-structure'
import { type FC, useState } from 'react'
import styles from './TableDiffBlock.module.css'
import { TableItem } from './TableItem'

type Props = {
  beforeTable?: Table
  afterTable?: Table
  diffItems: SchemaDiffItem[]
}

export const TableDiffBlock: FC<Props> = ({
  beforeTable,
  afterTable,
  diffItems,
}) => {
  const [isOpenColumns, setIsOpenColumns] = useState(true)
  const [isOpenIndex, setIsOpenIndex] = useState(true)
  const [isOpenConstraint, setIsOpenConstraint] = useState(true)

  return (
    <div className={styles.beforeAndAfter}>
      {beforeTable && (
        <TableItem
          table={beforeTable}
          diffItems={diffItems}
          type="before"
          isOpenColumns={isOpenColumns}
          isOpenIndex={isOpenIndex}
          isOpenConstraint={isOpenConstraint}
          onOpenChangeColumns={setIsOpenColumns}
          onOpenChangeIndex={setIsOpenIndex}
          onOpenChangeConstraint={setIsOpenConstraint}
        />
      )}
      {afterTable && (
        <TableItem
          table={afterTable}
          diffItems={diffItems}
          type="after"
          isOpenColumns={isOpenColumns}
          isOpenIndex={isOpenIndex}
          isOpenConstraint={isOpenConstraint}
          onOpenChangeColumns={setIsOpenColumns}
          onOpenChangeIndex={setIsOpenIndex}
          onOpenChangeConstraint={setIsOpenConstraint}
        />
      )}
    </div>
  )
}
