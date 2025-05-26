import type {
  ConstraintRelatedDiffItem,
  SchemaDiffItem,
} from '@liam-hq/db-structure'
import { match } from 'ts-pattern'
import diffStyles from '../../Diff.module.css'

type Params = {
  tableId: string
  constraintId: string
  diffItems: SchemaDiffItem[]
  kind: ConstraintRelatedDiffItem['kind']
  type: 'before' | 'after'
}

export function getChangeStatusStyle({
  tableId,
  constraintId,
  diffItems,
  kind,
  type,
}: Params) {
  const status =
    diffItems.find(
      (item) =>
        item.kind === kind &&
        item.tableId === tableId &&
        item.constraintId === constraintId,
    )?.status ?? 'unchanged'

  return match([status, type])
    .with(['added', 'after'], () => diffStyles.added)
    .with(['modified', 'after'], () => diffStyles.added)
    .with(['removed', 'before'], () => diffStyles.removed)
    .with(['modified', 'before'], () => diffStyles.removed)
    .otherwise(() => '')
}
