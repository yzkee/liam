import * as v from 'valibot'
import { extensionSchema } from '../../schema/schema.js'
import { PATH_PATTERNS } from '../constants.js'

// Add extension operation
const addExtensionOperation = v.object({
  op: v.literal('add'),
  path: v.pipe(
    v.string(),
    v.regex(PATH_PATTERNS.EXTENSION_BASE),
    v.description('Path to add extension (e.g., /extensions/vector)'),
  ),
  value: extensionSchema,
})

// Remove extension operation
const removeExtensionOperation = v.object({
  op: v.literal('remove'),
  path: v.pipe(
    v.string(),
    v.regex(PATH_PATTERNS.EXTENSION_BASE),
    v.description('Path to remove extension (e.g., /extensions/vector)'),
  ),
})

// Replace extension operation
const replaceExtensionOperation = v.object({
  op: v.literal('replace'),
  path: v.pipe(
    v.string(),
    v.regex(PATH_PATTERNS.EXTENSION_BASE),
    v.description('Path to replace extension (e.g., /extensions/vector)'),
  ),
  value: extensionSchema,
})

// Replace extension version operation
const replaceExtensionVersionOperation = v.object({
  op: v.literal('replace'),
  path: v.pipe(
    v.string(),
    v.regex(PATH_PATTERNS.EXTENSION_VERSION),
    v.description(
      'Path to replace extension version (e.g., /extensions/vector/version)',
    ),
  ),
  value: v.union([v.string(), v.null()]),
})

// Replace extension fromVersion operation
const replaceExtensionFromVersionOperation = v.object({
  op: v.literal('replace'),
  path: v.pipe(
    v.string(),
    v.regex(PATH_PATTERNS.EXTENSION_FROM_VERSION),
    v.description(
      'Path to replace extension fromVersion (e.g., /extensions/vector/fromVersion)',
    ),
  ),
  value: v.union([v.string(), v.null()]),
})

// Replace extension ifNotExists operation
const replaceExtensionIfNotExistsOperation = v.object({
  op: v.literal('replace'),
  path: v.pipe(
    v.string(),
    v.regex(PATH_PATTERNS.EXTENSION_IF_NOT_EXISTS),
    v.description(
      'Path to replace extension ifNotExists (e.g., /extensions/vector/ifNotExists)',
    ),
  ),
  value: v.union([v.boolean(), v.null()]),
})

// Replace extension cascade operation
const replaceExtensionCascadeOperation = v.object({
  op: v.literal('replace'),
  path: v.pipe(
    v.string(),
    v.regex(PATH_PATTERNS.EXTENSION_CASCADE),
    v.description(
      'Path to replace extension cascade (e.g., /extensions/vector/cascade)',
    ),
  ),
  value: v.union([v.boolean(), v.null()]),
})
export const extensionOperations = [
  addExtensionOperation,
  removeExtensionOperation,
  replaceExtensionOperation,
  replaceExtensionVersionOperation,
  replaceExtensionFromVersionOperation,
  replaceExtensionIfNotExistsOperation,
  replaceExtensionCascadeOperation,
]
