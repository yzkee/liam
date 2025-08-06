import {
  type ChangeStatus,
  columnDiffItemSchema,
  columnTypeDiffItemSchema,
  type SchemaDiffItem,
  tableDiffItemSchema,
} from '@liam-hq/schema'
import { safeParse } from 'valibot'

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
  const filteredDiffItems = diffItems.filter((d) => d.tableId === tableId)

  // Priority 1: Check for table-level changes (added/removed)
  // If the table itself has been added or removed, return that status immediately
  const tableRelatedDiffItem = filteredDiffItems.find((item) => {
    const parsed = safeParse(tableDiffItemSchema, item)
    return parsed.success
  })

  if (tableRelatedDiffItem) {
    return tableRelatedDiffItem.status
  }

  // Priority 2: Check for column-level changes (added/removed)
  // If the column itself has been added or removed, return that status immediately
  const columnDiffItem = filteredDiffItems.find((item) => {
    const parsed = safeParse(columnDiffItemSchema, item)
    return parsed.success && parsed.output.columnId === columnId
  })

  if (columnDiffItem) {
    return columnDiffItem.status
  }

  const columnTypeDiffItem = filteredDiffItems.find((item) => {
    const parsed = safeParse(columnTypeDiffItemSchema, item)
    return parsed.success && parsed.output.columnId === columnId
  })

  return columnTypeDiffItem?.status ?? 'unchanged'
}
