import {
  GridTableDd,
  GridTableDt,
  GridTableHeader,
  GridTableItem,
  GridTableRoot,
} from '@/components'
import type { SchemaDiffItem, UniqueConstraint } from '@liam-hq/db-structure'
import clsx from 'clsx'
import type { FC } from 'react'
import { getChangeStatusStyle } from './getChangeStatusStyle'

type Props = {
  constraint: UniqueConstraint
  tableId: string
  diffItems: SchemaDiffItem[]
  type: 'before' | 'after'
}

export const UniqueConstraintItem: FC<Props> = ({
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

  return (
    <GridTableRoot>
      <GridTableHeader className={constraintStyle}>
        {constraint.name}
      </GridTableHeader>
      <GridTableItem className={clsx(constraintStyle, constraintNameStyle)}>
        <GridTableDt>Column</GridTableDt>
        <GridTableDd>{constraint.columnName}</GridTableDd>
      </GridTableItem>
    </GridTableRoot>
  )
}
