import type { ChangeStatus, Operation } from '../index.js'

type Params = {
  operations: Operation[]
}

export function determineChangeStatus({ operations }: Params): ChangeStatus {
  if (operations.length === 0) return 'unchanged'

  if (operations.some((op) => op.op === 'replace')) {
    return 'modified'
  }

  const hasAddOperation = operations.some((op) => op.op === 'add')
  const hasRemoveOperation = operations.some((op) => op.op === 'remove')

  if (hasAddOperation && hasRemoveOperation) {
    return 'modified'
  }

  if (hasAddOperation) return 'added'
  if (hasRemoveOperation) return 'removed'

  return 'unchanged'
}
