import * as v from 'valibot'
import { tableSchema } from '../schema/index.js'
import { PATH_PATTERNS } from './constants.js'

const isTablePath = (input: unknown): boolean => {
  if (typeof input !== 'string') return false
  return PATH_PATTERNS.TABLE_BASE.test(input)
}

const addTableOperationSchema = v.object({
  op: v.literal('add'),
  path: v.custom<`/tables/${string}`>(
    isTablePath,
    'Path must match the pattern /tables/{tableName}',
  ),
  value: tableSchema,
})

export type AddTableOperation = v.InferOutput<typeof addTableOperationSchema>

export const isAddTableOperation = (
  operation: Operation,
): operation is AddTableOperation => {
  return operation.op === 'add' && isTablePath(operation.path)
}

const addOperationSchema = v.object({
  op: v.literal('add'),
  path: v.string(),
  value: v.any(),
})

const removeOperationSchema = v.object({
  op: v.literal('remove'),
  path: v.string(),
})

const replaceOperationSchema = v.object({
  op: v.literal('replace'),
  path: v.string(),
  value: v.any(),
})

const moveOperationSchema = v.object({
  op: v.literal('move'),
  from: v.string(),
  path: v.string(),
})

const copyOperationSchema = v.object({
  op: v.literal('copy'),
  from: v.string(),
  path: v.string(),
})

const testOperationSchema = v.object({
  op: v.literal('test'),
  path: v.string(),
  value: v.any(),
})

const operationSchema = v.union([
  addTableOperationSchema,
  addOperationSchema,
  removeOperationSchema,
  replaceOperationSchema,
  moveOperationSchema,
  copyOperationSchema,
  testOperationSchema,
])
export type Operation = v.InferOutput<typeof operationSchema>

export const operationsSchema = v.array(operationSchema)
