import * as v from 'valibot'
import { enumSchema } from '../../schema/index.js'
import { PATH_PATTERNS } from '../constants.js'
import type { Operation } from './index.js'

const enumPathSchema = v.pipe(v.string(), v.regex(PATH_PATTERNS.ENUM_BASE))
const enumNamePathSchema = v.pipe(v.string(), v.regex(PATH_PATTERNS.ENUM_NAME))
const enumValuesPathSchema = v.pipe(
  v.string(),
  v.regex(PATH_PATTERNS.ENUM_VALUES),
)
const enumCommentPathSchema = v.pipe(
  v.string(),
  v.regex(PATH_PATTERNS.ENUM_COMMENT),
)

const addEnumOperationSchema = v.pipe(
  v.object({
    op: v.literal('add'),
    path: enumPathSchema,
    value: enumSchema,
  }),
  v.description('Add new enum with complete definition'),
)

const removeEnumOperationSchema = v.pipe(
  v.object({
    op: v.literal('remove'),
    path: enumPathSchema,
  }),
  v.description('Remove existing enum'),
)

const replaceEnumNameOperationSchema = v.pipe(
  v.object({
    op: v.literal('replace'),
    path: enumNamePathSchema,
    value: v.string(),
  }),
  v.description('Rename existing enum'),
)

const replaceEnumValuesOperationSchema = v.pipe(
  v.object({
    op: v.literal('replace'),
    path: enumValuesPathSchema,
    value: v.array(v.string()),
  }),
  v.description('Replace enum values'),
)

const replaceEnumCommentOperationSchema = v.pipe(
  v.object({
    op: v.literal('replace'),
    path: enumCommentPathSchema,
    value: v.union([v.string(), v.null()]),
  }),
  v.description('Replace enum comment'),
)

export type AddEnumOperation = v.InferOutput<typeof addEnumOperationSchema>
export type RemoveEnumOperation = v.InferOutput<
  typeof removeEnumOperationSchema
>
export type ReplaceEnumNameOperation = v.InferOutput<
  typeof replaceEnumNameOperationSchema
>
export type ReplaceEnumValuesOperation = v.InferOutput<
  typeof replaceEnumValuesOperationSchema
>
export type ReplaceEnumCommentOperation = v.InferOutput<
  typeof replaceEnumCommentOperationSchema
>

export const isAddEnumOperation = (
  operation: Operation,
): operation is AddEnumOperation => {
  return v.safeParse(addEnumOperationSchema, operation).success
}

export const isRemoveEnumOperation = (
  operation: Operation,
): operation is RemoveEnumOperation => {
  return v.safeParse(removeEnumOperationSchema, operation).success
}

export const isReplaceEnumNameOperation = (
  operation: Operation,
): operation is ReplaceEnumNameOperation => {
  return v.safeParse(replaceEnumNameOperationSchema, operation).success
}

export const isReplaceEnumValuesOperation = (
  operation: Operation,
): operation is ReplaceEnumValuesOperation => {
  return v.safeParse(replaceEnumValuesOperationSchema, operation).success
}

export const isReplaceEnumCommentOperation = (
  operation: Operation,
): operation is ReplaceEnumCommentOperation => {
  return v.safeParse(replaceEnumCommentOperationSchema, operation).success
}

export const enumOperations = [
  addEnumOperationSchema,
  removeEnumOperationSchema,
  replaceEnumNameOperationSchema,
  replaceEnumValuesOperationSchema,
  replaceEnumCommentOperationSchema,
]
