import { compare } from 'fast-json-patch'
import type { Schema } from '../schema/index.js'
import { buildColumnCheckDiffItem } from './columns/buildColumnCheckDiffItem.js'
import { buildColumnCommentDiffItem } from './columns/buildColumnCommentDiffItem.js'
import { buildColumnDefaultDiffItem } from './columns/buildColumnDefaultDiffItem.js'
import { buildColumnDiffItem } from './columns/buildColumnDiffItem.js'
import { buildColumnNameDiffItem } from './columns/buildColumnNameDiffItem.js'
import { buildColumnNotNullDiffItem } from './columns/buildColumnNotNullDiffItem.js'
import { buildColumnPrimaryDiffItem } from './columns/buildColumnPrimaryDiffItem.js'
import { buildColumnUniqueDiffItem } from './columns/buildColumnUniqueDiffItem.js'
import { buildTableCommentDiffItem } from './tables/buildTableCommentDiffItem.js'
import { buildTableDiffItem } from './tables/buildTableDiffItem.js'
import { buildTableNameDiffItem } from './tables/buildTableNameDiffItem.js'
import type {
  ColumnRelatedDiffItem,
  SchemaDiffItem,
  TableRelatedDiffItem,
} from './types.js'

function buildTableRelatedDiffItems(
  tableId: string,
  before: Schema,
  after: Schema,
  operations: ReturnType<typeof compare>,
): TableRelatedDiffItem[] {
  const items: TableRelatedDiffItem[] = []

  const tableDiffItem = buildTableDiffItem(tableId, before, after, operations)
  if (tableDiffItem) {
    items.push(tableDiffItem)
  }

  const tableNameDiffItem = buildTableNameDiffItem(
    tableId,
    before,
    after,
    operations,
  )
  if (tableNameDiffItem) {
    items.push(tableNameDiffItem)
  }

  const tableCommentDiffItem = buildTableCommentDiffItem(
    tableId,
    before,
    after,
    operations,
  )
  if (tableCommentDiffItem) {
    items.push(tableCommentDiffItem)
  }

  return items
}

function buildColumnRelatedDiffItems(
  tableId: string,
  columnId: string,
  before: Schema,
  after: Schema,
  operations: ReturnType<typeof compare>,
): ColumnRelatedDiffItem[] {
  const items: ColumnRelatedDiffItem[] = []

  const columnDiffItem = buildColumnDiffItem(
    tableId,
    columnId,
    before,
    after,
    operations,
  )
  if (columnDiffItem) {
    items.push(columnDiffItem)
  }

  const columnNameDiffItem = buildColumnNameDiffItem(
    tableId,
    columnId,
    before,
    after,
    operations,
  )
  if (columnNameDiffItem) {
    items.push(columnNameDiffItem)
  }

  const columnCommentDiffItem = buildColumnCommentDiffItem(
    tableId,
    columnId,
    before,
    after,
    operations,
  )
  if (columnCommentDiffItem) {
    items.push(columnCommentDiffItem)
  }

  const columnPrimaryDiffItem = buildColumnPrimaryDiffItem(
    tableId,
    columnId,
    before,
    after,
    operations,
  )
  if (columnPrimaryDiffItem) {
    items.push(columnPrimaryDiffItem)
  }

  const columnDefaultDiffItem = buildColumnDefaultDiffItem(
    tableId,
    columnId,
    before,
    after,
    operations,
  )
  if (columnDefaultDiffItem) {
    items.push(columnDefaultDiffItem)
  }

  const columnCheckDiffItem = buildColumnCheckDiffItem(
    tableId,
    columnId,
    before,
    after,
    operations,
  )
  if (columnCheckDiffItem) {
    items.push(columnCheckDiffItem)
  }

  const columnUniqueDiffItem = buildColumnUniqueDiffItem(
    tableId,
    columnId,
    before,
    after,
    operations,
  )
  if (columnUniqueDiffItem) {
    items.push(columnUniqueDiffItem)
  }

  const columnNotNullDiffItem = buildColumnNotNullDiffItem(
    tableId,
    columnId,
    before,
    after,
    operations,
  )
  if (columnNotNullDiffItem) {
    items.push(columnNotNullDiffItem)
  }

  return items
}

export function buildSchemaDiff(
  before: Schema,
  after: Schema,
): SchemaDiffItem[] {
  const items: SchemaDiffItem[] = []
  const operations = compare(before, after)
  const allTables = Object.values({ ...before.tables, ...after.tables })

  for (const table of allTables) {
    const tableId = table.name

    const tableDiffItems = buildTableRelatedDiffItems(
      tableId,
      before,
      after,
      operations,
    )
    items.push(...tableDiffItems)

    for (const column of Object.values(table.columns)) {
      const columnId = column.name
      const columnDiffItems = buildColumnRelatedDiffItems(
        tableId,
        columnId,
        before,
        after,
        operations,
      )
      items.push(...columnDiffItems)
    }
  }

  return items
}
