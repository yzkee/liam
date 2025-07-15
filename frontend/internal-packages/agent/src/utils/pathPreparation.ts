import type { Operation } from 'fast-json-patch'
import { err, ok, type Result } from 'neverthrow'

/**
 * Unescape JSON Pointer path according to RFC 6901
 */
function unescapeJsonPointer(path: string): string {
  return path.replace(/~1/g, '/').replace(/~0/g, '~')
}

/**
 * Check if value is a record object
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Create nested path if it doesn't exist
 */
function createNestedPath(
  target: Record<string, unknown>,
  pathParts: string[],
): Result<void, string> {
  let current: Record<string, unknown> = target

  for (let i = 0; i < pathParts.length - 1; i++) {
    const part = pathParts[i]
    if (!part) continue

    // Prevent prototype pollution by checking for dangerous keys
    if (
      part === '__proto__' ||
      part === 'constructor' ||
      part === 'prototype'
    ) {
      return err(`Dangerous path part detected: ${part}`)
    }

    if (!(part in current)) {
      const nextPart = pathParts[i + 1]
      const isArrayIndex = nextPart && /^\d+$/.test(nextPart)
      current[part] = isArrayIndex ? [] : {}
    }

    const next = current[part]
    if (isRecord(next)) {
      current = next
    } else if (Array.isArray(next)) {
      // Handle array traversal: ensure array element exists as object
      const nextPart = pathParts[i + 1]
      if (nextPart && /^\d+$/.test(nextPart)) {
        const index = Number(nextPart)
        // Ensure array is large enough and has object at index
        while (next.length <= index) {
          next.push({})
        }
        if (!isRecord(next[index])) {
          next[index] = {}
        }
        const arrayElement = next[index]
        if (isRecord(arrayElement)) {
          current = arrayElement
        }
        i++ // Skip the numeric index in next iteration
      }
    }
  }

  return ok(undefined)
}

/**
 * Ensure the necessary path structure exists before applying patch operations
 * This prevents "OPERATION_PATH_UNRESOLVABLE" errors
 */
export function ensurePathStructure(
  target: Record<string, unknown>,
  operations: Operation[],
): Result<void, string> {
  const modifyingOps = operations.filter(
    (op) => op.op === 'add' || op.op === 'replace',
  )

  for (const op of modifyingOps) {
    // RFC 6901: Split first, then unescape each part
    const pathParts = op.path.split('/').filter((part) => part !== '')
    const unescapedParts = pathParts.map((part) => unescapeJsonPointer(part))

    const result = createNestedPath(target, unescapedParts)
    if (result.isErr()) {
      return result
    }
  }

  return ok(undefined)
}
