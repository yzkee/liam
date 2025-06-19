import { JsonPatchError, type Operation, applyPatch } from 'fast-json-patch'

export function applyPatchOperations<T extends Record<string, unknown>>(
  target: T,
  operations: Operation[],
): void {
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
      // For add and replace operations on non-existent nested paths, throw the error
    }
    // Re-throw all errors
    throw error
  }
}
