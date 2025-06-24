import {
  type ChangeStatus,
  type ColumnRelatedDiffItem,
  columnRelatedDiffItemSchema,
  type SchemaDiffItem,
  tableRelatedDiffItemSchema,
} from '@liam-hq/db-structure'
import { safeParse } from 'valibot'

const isColumnRelatedDiffItem = (
  item: SchemaDiffItem,
): item is ColumnRelatedDiffItem => {
  return safeParse(columnRelatedDiffItemSchema, item).success
}

type Params = {
  tableId: string
  columnId: string
  diffItems: SchemaDiffItem[]
}

export function getChangeStatus({
  tableId,
  columnId,
  diffItems,
}: Params): ChangeStatus {
  const tableRelatedItems = diffItems.filter((d) => d.tableId === tableId)
  const tableRelatedItem = tableRelatedItems.find((item) => {
    const parsed = safeParse(tableRelatedDiffItemSchema, item)
    return parsed.success
  })

  if (tableRelatedItem) {
    return tableRelatedItem.status
  }

  const filteredDiffItems = diffItems.filter((d) => isColumnRelatedDiffItem(d))
  const columnRelatedItem = filteredDiffItems.find(
    (d) => d.tableId === tableId && d.columnId === columnId,
  )

  return columnRelatedItem?.status ?? 'unchanged'
}
