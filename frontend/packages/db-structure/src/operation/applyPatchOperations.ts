import { JsonPatchError, type Operation, applyPatch } from 'fast-json-patch'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function createIntermediateObjects(
  current: Record<string, unknown>,
  pathSegments: string[],
): Record<string, unknown> {
  let obj = current
  for (let i = 0; i < pathSegments.length - 1; i++) {
    const key = pathSegments[i]
    if (!key) continue

    if (!isRecord(obj[key])) {
      obj[key] = {}
    }
    obj = obj[key] as Record<string, unknown>
  }
  return obj
}

function handleReplaceOperation(
  current: Record<string, unknown>,
  lastKey: string,
): void {
  if (!(lastKey in current)) {
    current[lastKey] = undefined
  }
}

function ensureNestedPaths<T extends Record<string, unknown>>(
  target: T,
  operations: Operation[],
): void {
  for (const operation of operations) {
    if (operation.op !== 'add' && operation.op !== 'replace') continue

    const pathSegments = operation.path.split('/').filter(Boolean)
    if (pathSegments.length === 0) continue

    const lastKey = pathSegments[pathSegments.length - 1]
    if (!lastKey) continue

    const parentObject = createIntermediateObjects(target, pathSegments)

    if (operation.op === 'replace') {
      handleReplaceOperation(parentObject, lastKey)
    }
  }
}

export function applyPatchOperations<T extends Record<string, unknown>>(
  target: T,
  operations: Operation[],
): void {
  // Ensure nested paths exist before applying patches
  ensureNestedPaths(target, operations)

  try {
    // Apply all patches using the fast applyPatch function
    applyPatch(target, operations, true, true)
  } catch (error: unknown) {
    // Handle PatchError for OPERATION_PATH_UNRESOLVABLE
    if (
      error instanceof JsonPatchError &&
      error.name === 'OPERATION_PATH_UNRESOLVABLE' &&
      error.operation
    ) {
      const operation = error.operation as Operation
      if (operation.op === 'remove') {
        // Silently ignore remove operations on non-existent paths
        return
      }
      if (operation.op === 'replace') {
        // For replace operations on non-existent paths, treat as add
        const addOperation: Operation = {
          op: 'add',
          path: operation.path,
          value: operation.value,
        }
        applyPatch(target, [addOperation], true, true)
        return
      }
    }
    // Re-throw other errors
    throw error
  }
}
