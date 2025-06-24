import {
  type ChangeStatus,
  columnRelatedDiffItemSchema,
  type SchemaDiffItem,
  tableRelatedDiffItemSchema,
} from '@liam-hq/db-structure'
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

  return 'unchanged'
}
