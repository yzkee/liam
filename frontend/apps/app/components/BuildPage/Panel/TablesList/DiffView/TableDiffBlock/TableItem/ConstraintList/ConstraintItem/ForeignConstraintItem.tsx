import {
  GridTableDd,
  GridTableDt,
  GridTableHeader,
  GridTableItem,
  GridTableRoot,
} from '@/components'
import type {
  ForeignKeyConstraint,
  SchemaDiffItem,
} from '@liam-hq/db-structure'
import clsx from 'clsx'
import { Table2 } from 'lucide-react'
import type { FC } from 'react'
import styles from './ConstraintItem.module.css'
import { getChangeStatusStyle } from './getChangeStatusStyle'

type Props = {
  constraint: ForeignKeyConstraint
  tableId: string
  diffItems: SchemaDiffItem[]
  type: 'before' | 'after'
}

export const ForeignKeyConstraintItem: FC<Props> = ({
  constraint,
  tableId,
  diffItems,
  type,
}) => {
  const constraintStyle = getChangeStatusStyle({
    tableId,
    constraintId: constraint.name,
    diffItems,
    kind: 'constraint',
    type,
  })

  const constraintNameStyle = getChangeStatusStyle({
    tableId,
    constraintId: constraint.name,
    diffItems,
    kind: 'constraint-name',
    type,
  })

  const constraintTargetTableStyle = getChangeStatusStyle({
    tableId,
    constraintId: constraint.name,
    diffItems,
    kind: 'constraint-target-table-name',
    type,
  })

  const constraintTargetColumnStyle = getChangeStatusStyle({
    tableId,
    constraintId: constraint.name,
    diffItems,
    kind: 'constraint-target-column-name',
    type,
  })

  const constraintUpdateConstraintStyle = getChangeStatusStyle({
    tableId,
    constraintId: constraint.name,
    diffItems,
    kind: 'constraint-update-constraint',
    type,
  })

  const constraintDeleteConstraintStyle = getChangeStatusStyle({
    tableId,
    constraintId: constraint.name,
    diffItems,
    kind: 'constraint-delete-constraint',
    type,
  })

  return (
    <GridTableRoot>
      <GridTableHeader className={constraintStyle}>
        {constraint.name}
      </GridTableHeader>
      <GridTableItem className={clsx(constraintStyle, constraintNameStyle)}>
        <GridTableDt>Column</GridTableDt>
        <GridTableDd>{constraint.columnName}</GridTableDd>
      </GridTableItem>
      <GridTableItem
        className={clsx(
          constraintStyle,
          constraintTargetTableStyle,
          constraintTargetColumnStyle,
        )}
      >
        <GridTableDt>Target Table</GridTableDt>
        <GridTableDd>
          <Table2 className={styles.icon} />
          {`${constraint.targetTableName}.${constraint.targetColumnName}`}
        </GridTableDd>
      </GridTableItem>
      <GridTableItem
        className={clsx(constraintStyle, constraintUpdateConstraintStyle)}
      >
        <GridTableDt>On Update</GridTableDt>
        <GridTableDd>{constraint.updateConstraint}</GridTableDd>
      </GridTableItem>
      <GridTableItem
        className={clsx(constraintStyle, constraintDeleteConstraintStyle)}
      >
        <GridTableDt>On Delete</GridTableDt>
        <GridTableDd>{constraint.deleteConstraint}</GridTableDd>
      </GridTableItem>
    </GridTableRoot>
  )
}
