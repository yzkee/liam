import {
  type ChangeStatus,
  columnCommentDiffItemSchema,
  type SchemaDiffItem,
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

  const columnCommentDiffItem = filteredDiffItems.find((item) => {
    const parsed = safeParse(columnCommentDiffItemSchema, item)
    return parsed.success && parsed.output.columnId === columnId
  })

  return columnCommentDiffItem?.status ?? 'unchanged'
}
