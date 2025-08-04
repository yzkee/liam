import {
  type ChangeStatus,
  indexDiffItemSchema,
  indexUniqueDiffItemSchema,
  type SchemaDiffItem,
  tableDiffItemSchema,
} from '@liam-hq/db-structure'
import { safeParse } from 'valibot'

type Params = {
  tableId: string
  indexId: string
  diffItems: SchemaDiffItem[]
}

export function getChangeStatus({
  tableId,
  indexId,
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

  // Priority 2: Check for index-level changes (added/removed)
  // If the index itself has been added or removed, return that status immediately
  const indexDiffItem = filteredDiffItems.find((item) => {
    const parsed = safeParse(indexDiffItemSchema, item)
    return parsed.success && parsed.output.indexId === indexId
  })

  if (indexDiffItem) {
    return indexDiffItem.status
  }

  const indexUniqueDiffItem = filteredDiffItems.find((item) => {
    const parsed = safeParse(indexUniqueDiffItemSchema, item)
    return parsed.success && parsed.output.indexId === indexId
  })

  return indexUniqueDiffItem?.status ?? 'unchanged'
}
