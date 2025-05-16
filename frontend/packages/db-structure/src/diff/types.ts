import type {
  Column,
  Comment,
  Constraint,
  Index,
  Table,
  TableName,
} from '../schema/index.js'

export type ChangeStatus = 'added' | 'removed' | 'modified' | 'unchanged'

type BaseSchemaDiffItem = {
  status: ChangeStatus
  tableId: string
}

export type TableDiffItem = BaseSchemaDiffItem & {
  kind: 'table'
  data: Table
}

export type TableNameDiffItem = BaseSchemaDiffItem & {
  kind: 'table-name'
  data: TableName
}

export type TableCommentDiffItem = BaseSchemaDiffItem & {
  kind: 'table-comment'
  data: Comment
}

export type ColumnDiffItem = BaseSchemaDiffItem & {
  kind: 'column'
  data: Column
}

export type IndexDiffItem = BaseSchemaDiffItem & {
  kind: 'index'
  data: Index
}

export type ConstraintDiffItem = BaseSchemaDiffItem & {
  kind: 'constraint'
  data: Constraint
}

export type SchemaDiffItem =
  | TableDiffItem
  | TableNameDiffItem
  | TableCommentDiffItem
  | ColumnDiffItem
  | IndexDiffItem
  | ConstraintDiffItem
