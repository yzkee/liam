import {
  type ChangeStatus,
  constraintDiffItemSchema,
  constraintNameDiffItemSchema,
  type SchemaDiffItem,
  tableDiffItemSchema,
} from '@liam-hq/db-structure'
import { safeParse } from 'valibot'

type Params = {
  tableId: string
  constraintId: string
  diffItems: SchemaDiffItem[]
}

export function getChangeStatus({
  tableId,
  constraintId,
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

  // Priority 2: Check for constraint-level changes (added/removed)
  // If the constraint itself has been added or removed, return that status immediately
  const constraintDiffItem = filteredDiffItems.find((item) => {
    const parsed = safeParse(constraintDiffItemSchema, item)
    return (
      parsed.success &&
      parsed.output.constraintId === constraintId &&
      parsed.output.data.type === 'FOREIGN KEY'
    )
  })

  if (constraintDiffItem) {
    return constraintDiffItem.status
  }

  // Check for constraint name changes
  const constraintNameDiffItem = filteredDiffItems.find((item) => {
    const parsed = safeParse(constraintNameDiffItemSchema, item)
    return parsed.success && parsed.output.constraintId === constraintId
  })

  return constraintNameDiffItem?.status ?? 'unchanged'
}
