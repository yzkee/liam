import {
  GridTableDd,
  GridTableDt,
  GridTableHeader,
  GridTableItem,
  GridTableRoot,
} from '@/components'
import type { CheckConstraint, SchemaDiffItem } from '@liam-hq/db-structure'
import clsx from 'clsx'
import type { FC } from 'react'
import { getChangeStatusStyle } from './getChangeStatusStyle'

type Props = {
  constraint: CheckConstraint
  tableId: string
  diffItems: SchemaDiffItem[]
  type: 'before' | 'after'
}

export const CheckConstraintItem: FC<Props> = ({
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

  const constraintDetailStyle = getChangeStatusStyle({
    tableId,
    constraintId: constraint.name,
    diffItems,
    kind: 'constraint-detail',
    type,
  })

  return (
    <GridTableRoot>
      <GridTableHeader className={constraintStyle}>
        {constraint.name}
      </GridTableHeader>
      <GridTableItem className={clsx(constraintStyle, constraintDetailStyle)}>
        <GridTableDt>Detail</GridTableDt>
        <GridTableDd>{constraint.detail}</GridTableDd>
      </GridTableItem>
    </GridTableRoot>
  )
}
