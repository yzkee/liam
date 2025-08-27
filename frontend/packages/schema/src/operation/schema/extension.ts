import * as v from 'valibot'
import { extensionSchema } from '../../schema/schema.js'

// Add extension operation
const addExtensionOperation = v.object({
  op: v.literal('add'),
  path: v.pipe(
    v.string(),
    v.regex(/^\/extensions\/[^/]+$/),
    v.description('Path to add extension (e.g., /extensions/vector)'),
  ),
  value: extensionSchema,
})

// Remove extension operation
const removeExtensionOperation = v.object({
  op: v.literal('remove'),
  path: v.pipe(
    v.string(),
    v.regex(/^\/extensions\/[^/]+$/),
    v.description('Path to remove extension (e.g., /extensions/vector)'),
  ),
})

// Replace extension operation
const replaceExtensionOperation = v.object({
  op: v.literal('replace'),
  path: v.pipe(
    v.string(),
    v.regex(/^\/extensions\/[^/]+$/),
    v.description('Path to replace extension (e.g., /extensions/vector)'),
  ),
  value: extensionSchema,
})

// Replace extension property operation
const replaceExtensionPropertyOperation = v.object({
  op: v.literal('replace'),
  path: v.pipe(
    v.string(),
    v.regex(/^\/extensions\/[^/]+\/(version|fromVersion|ifNotExists|cascade)$/),
    v.description(
      'Path to replace extension property (e.g., /extensions/vector/version)',
    ),
  ),
  value: v.union([v.string(), v.boolean(), v.null()]),
})

export const extensionOperations = [
  addExtensionOperation,
  removeExtensionOperation,
  replaceExtensionOperation,
  replaceExtensionPropertyOperation,
]
