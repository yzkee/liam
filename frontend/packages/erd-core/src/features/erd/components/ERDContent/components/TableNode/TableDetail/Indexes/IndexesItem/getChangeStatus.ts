import {
  type ChangeStatus,
  indexRelatedDiffItemSchema,
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

  const indexRelatedDiffItems = filteredDiffItems.filter((item) => {
    const parsed = safeParse(indexRelatedDiffItemSchema, item)
    return parsed.success && parsed.output.indexId === indexId
  })

  if (indexRelatedDiffItems.length === 0) {
    return 'unchanged'
  }

  // Collect all unique statuses from index changes
  const statuses = indexRelatedDiffItems.map((item) => item.status)
  const uniqueStatuses = new Set(statuses)

  // All indexes have the same change status
  if (uniqueStatuses.size === 1 && statuses[0] !== undefined) {
    return statuses[0]
  }

  // Mixed statuses indicate the index has been modified
  return 'modified'
}
