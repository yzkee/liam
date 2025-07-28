import pkg, { type Operation } from 'fast-json-patch'
import { Result } from 'neverthrow'

const { applyPatch } = pkg // see https://github.com/Starcounter-Jack/JSON-Patch/issues/310

export function applyPatchOperations<T extends Record<string, unknown>>(
  target: T,
  operations: Operation[],
): Result<T, Error> {
  const clonedTarget = structuredClone(target)

  return Result.fromThrowable(
    () => {
      applyPatch(clonedTarget, operations, true, true)
      return clonedTarget
    },
    (error) => (error instanceof Error ? error : new Error(String(error))),
  )()
}
