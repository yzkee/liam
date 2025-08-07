import {
  type ChangeStatus,
  columnRelatedDiffItemSchema,
  constraintRelatedDiffItemSchema,
  indexRelatedDiffItemSchema,
  type SchemaDiffItem,
  tableRelatedDiffItemSchema,
} from '@liam-hq/schema'
import { safeParse } from 'valibot'

type Params = {
  tableId: string
  diffItems: SchemaDiffItem[]
}

export function getChangeStatus({ tableId, diffItems }: Params): ChangeStatus {
  const filteredDiffItems = diffItems.filter((d) => d.tableId === tableId)

  const tableRelatedItem = filteredDiffItems.find((item) => {
    const parsed = safeParse(tableRelatedDiffItemSchema, item)
    return parsed.success
  })

  if (tableRelatedItem) {
    return tableRelatedItem.status
  }

  const hasColumnRelatedItem = filteredDiffItems.some((item) => {
    const parsed = safeParse(columnRelatedDiffItemSchema, item)
    return parsed.success
  })

  if (hasColumnRelatedItem) {
    return 'modified'
  }

  const hasIndexRelatedItem = filteredDiffItems.some((item) => {
    const parsed = safeParse(indexRelatedDiffItemSchema, item)
    return parsed.success
  })

  if (hasIndexRelatedItem) {
    return 'modified'
  }

  const hasConstraintRelatedItem = filteredDiffItems.some((item) => {
    const parsed = safeParse(constraintRelatedDiffItemSchema, item)
    return parsed.success
  })

  if (hasConstraintRelatedItem) {
    return 'modified'
  }

  return 'unchanged'
}
