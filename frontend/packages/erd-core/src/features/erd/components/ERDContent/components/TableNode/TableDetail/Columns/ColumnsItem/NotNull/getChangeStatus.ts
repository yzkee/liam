import {
  type ChangeStatus,
  columnDiffItemSchema,
  columnNotNullDiffItemSchema,
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
  const tableRelatedDiffItem = filteredDiffItems.find((item) => {
    const parsed = safeParse(tableDiffItemSchema, item)
    return parsed.success
  })

  if (tableRelatedDiffItem) {
    return tableRelatedDiffItem.status
  }

  // Priority 2: Check for column-level changes (added/removed)
  const columnDiffItem = filteredDiffItems.find((item) => {
    const parsed = safeParse(columnDiffItemSchema, item)
    return parsed.success && parsed.output.columnId === columnId
  })

  if (columnDiffItem) {
    return columnDiffItem.status
  }

  // Priority 3: Check for column not-null changes
  const columnNotNullDiffItem = filteredDiffItems.find((item) => {
    const parsed = safeParse(columnNotNullDiffItemSchema, item)
    return parsed.success && parsed.output.columnId === columnId
  })

  return columnNotNullDiffItem?.status ?? 'unchanged'
}
