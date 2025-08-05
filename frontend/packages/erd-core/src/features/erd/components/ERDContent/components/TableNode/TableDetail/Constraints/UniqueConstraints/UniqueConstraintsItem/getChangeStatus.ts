import {
  type ChangeStatus,
  constraintColumnNameDiffItemSchema,
  constraintDiffItemSchema,
  constraintNameDiffItemSchema,
  type SchemaDiffItem,
  tableDiffItemSchema,
} from '@liam-hq/db-structure'
import { safeParse, union } from 'valibot'

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
      parsed.output.data.type === 'UNIQUE'
    )
  })

  if (constraintDiffItem) {
    return constraintDiffItem.status
  }

  // Check for constraint name or columns changes
  const constraintRelatedDiffItems = filteredDiffItems.filter((item) => {
    const parsed = safeParse(
      union([constraintNameDiffItemSchema, constraintColumnNameDiffItemSchema]),
      item,
    )
    return parsed.success && parsed.output.constraintId === constraintId
  })

  if (constraintRelatedDiffItems.length === 0) {
    return 'unchanged'
  }

  // Collect all unique statuses from column changes
  const statuses = constraintRelatedDiffItems.map((item) => item.status)
  const uniqueStatuses = new Set(statuses)

  // All columns have the same change status
  if (uniqueStatuses.size === 1 && statuses[0] !== undefined) {
    return statuses[0]
  }

  // Mixed statuses indicate the constraint has been modified
  return 'modified'
}
