import {
  array,
  type InferOutput,
  literal,
  object,
  picklist,
  string,
  union,
} from 'valibot'
import {
  checkConstraintDetailSchema,
  columnCheckSchema,
  columnDefaultSchema,
  columnNameSchema,
  columnNotNullSchema,
  columnSchema,
  columnTypeSchema,
  commentSchema,
  constraintNameSchema,
  constraintSchema,
  foreignKeyConstraintReferenceOptionSchema,
  indexColumnsSchema,
  indexNameSchema,
  indexSchema,
  indexTypeSchema,
  indexUniqueSchema,
  tableNameSchema,
  tableSchema,
} from '../schema/index.js'

const changeStatusSchema = picklist([
  'added',
  'removed',
  'modified',
  'unchanged',
])
export type ChangeStatus = InferOutput<typeof changeStatusSchema>

const baseSchemaDiffItemSchema = object({
  status: changeStatusSchema,
  tableId: string(),
})

export const tableDiffItemSchema = object({
  ...baseSchemaDiffItemSchema.entries,
  kind: literal('table'),
  data: tableSchema,
})
export type TableDiffItem = InferOutput<typeof tableDiffItemSchema>

export const tableNameDiffItemSchema = object({
  ...baseSchemaDiffItemSchema.entries,
  kind: literal('table-name'),
  data: tableNameSchema,
})
export type TableNameDiffItem = InferOutput<typeof tableNameDiffItemSchema>

export const tableCommentDiffItemSchema = object({
  ...baseSchemaDiffItemSchema.entries,
  kind: literal('table-comment'),
  data: commentSchema,
})
export type TableCommentDiffItem = InferOutput<
  typeof tableCommentDiffItemSchema
>

export const columnDiffItemSchema = object({
  ...baseSchemaDiffItemSchema.entries,
  kind: literal('column'),
  data: columnSchema,
  columnId: string(),
})
export type ColumnDiffItem = InferOutput<typeof columnDiffItemSchema>

const columnNameDiffItemSchema = object({
  ...baseSchemaDiffItemSchema.entries,
  kind: literal('column-name'),
  data: columnNameSchema,
  columnId: string(),
})
export type ColumnNameDiffItem = InferOutput<typeof columnNameDiffItemSchema>

export const columnTypeDiffItemSchema = object({
  ...baseSchemaDiffItemSchema.entries,
  kind: literal('column-type'),
  data: columnTypeSchema,
  columnId: string(),
})
export type ColumnTypeDiffItem = InferOutput<typeof columnTypeDiffItemSchema>

export const columnCommentDiffItemSchema = object({
  ...baseSchemaDiffItemSchema.entries,
  kind: literal('column-comment'),
  data: commentSchema,
  columnId: string(),
})
export type ColumnCommentDiffItem = InferOutput<
  typeof columnCommentDiffItemSchema
>

export const columnDefaultDiffItemSchema = object({
  ...baseSchemaDiffItemSchema.entries,
  kind: literal('column-default'),
  data: columnDefaultSchema,
  columnId: string(),
})
export type ColumnDefaultDiffItem = InferOutput<
  typeof columnDefaultDiffItemSchema
>

const columnCheckDiffItemSchema = object({
  ...baseSchemaDiffItemSchema.entries,
  kind: literal('column-check'),
  data: columnCheckSchema,
  columnId: string(),
})
export type ColumnCheckDiffItem = InferOutput<typeof columnCheckDiffItemSchema>

export const columnNotNullDiffItemSchema = object({
  ...baseSchemaDiffItemSchema.entries,
  kind: literal('column-not-null'),
  data: columnNotNullSchema,
  columnId: string(),
})
export type ColumnNotNullDiffItem = InferOutput<
  typeof columnNotNullDiffItemSchema
>

export const indexDiffItemSchema = object({
  ...baseSchemaDiffItemSchema.entries,
  kind: literal('index'),
  data: indexSchema,
  indexId: string(),
})
export type IndexDiffItem = InferOutput<typeof indexDiffItemSchema>

export const indexNameDiffItemSchema = object({
  ...baseSchemaDiffItemSchema.entries,
  kind: literal('index-name'),
  data: indexNameSchema,
  indexId: string(),
})
export type IndexNameDiffItem = InferOutput<typeof indexNameDiffItemSchema>

export const indexUniqueDiffItemSchema = object({
  ...baseSchemaDiffItemSchema.entries,
  kind: literal('index-unique'),
  data: indexUniqueSchema,
  indexId: string(),
})
export type IndexUniqueDiffItem = InferOutput<typeof indexUniqueDiffItemSchema>

export const indexColumnsDiffItemSchema = object({
  ...baseSchemaDiffItemSchema.entries,
  kind: literal('index-columns'),
  data: indexColumnsSchema,
  indexId: string(),
})
export type IndexColumnsDiffItem = InferOutput<
  typeof indexColumnsDiffItemSchema
>

export const indexTypeDiffItemSchema = object({
  ...baseSchemaDiffItemSchema.entries,
  kind: literal('index-type'),
  data: indexTypeSchema,
  indexId: string(),
})
export type IndexTypeDiffItem = InferOutput<typeof indexTypeDiffItemSchema>

export const constraintDiffItemSchema = object({
  ...baseSchemaDiffItemSchema.entries,
  kind: literal('constraint'),
  data: constraintSchema,
  constraintId: string(),
})
export type ConstraintDiffItem = InferOutput<typeof constraintDiffItemSchema>

export const constraintNameDiffItemSchema = object({
  ...baseSchemaDiffItemSchema.entries,
  kind: literal('constraint-name'),
  data: constraintNameSchema,
  constraintId: string(),
})
export type ConstraintNameDiffItem = InferOutput<
  typeof constraintNameDiffItemSchema
>

export const constraintColumnNameDiffItemSchema = object({
  ...baseSchemaDiffItemSchema.entries,
  kind: literal('constraint-column-name'),
  data: columnNameSchema,
  constraintId: string(),
})
export type ConstraintColumnNameDiffItem = InferOutput<
  typeof constraintColumnNameDiffItemSchema
>

export const constraintTargetTableNameDiffItemSchema = object({
  ...baseSchemaDiffItemSchema.entries,
  kind: literal('constraint-target-table-name'),
  data: tableNameSchema,
  constraintId: string(),
})
export type ConstraintTargetTableNameDiffItem = InferOutput<
  typeof constraintTargetTableNameDiffItemSchema
>

export const constraintTargetColumnNameDiffItemSchema = object({
  ...baseSchemaDiffItemSchema.entries,
  kind: literal('constraint-target-column-name'),
  data: columnNameSchema,
  constraintId: string(),
})
export type ConstraintTargetColumnNameDiffItem = InferOutput<
  typeof constraintTargetColumnNameDiffItemSchema
>

export const constraintUpdateConstraintDiffItemSchema = object({
  ...baseSchemaDiffItemSchema.entries,
  kind: literal('constraint-update-constraint'),
  data: foreignKeyConstraintReferenceOptionSchema,
  constraintId: string(),
})
export type ConstraintUpdateConstraintDiffItem = InferOutput<
  typeof constraintUpdateConstraintDiffItemSchema
>

export const constraintDeleteConstraintDiffItemSchema = object({
  ...baseSchemaDiffItemSchema.entries,
  kind: literal('constraint-delete-constraint'),
  data: foreignKeyConstraintReferenceOptionSchema,
  constraintId: string(),
})
export type ConstraintDeleteConstraintDiffItem = InferOutput<
  typeof constraintDeleteConstraintDiffItemSchema
>

export const constraintDetailDiffItemSchema = object({
  ...baseSchemaDiffItemSchema.entries,
  kind: literal('constraint-detail'),
  data: checkConstraintDetailSchema,
  constraintId: string(),
})
export type ConstraintDetailDiffItem = InferOutput<
  typeof constraintDetailDiffItemSchema
>

export const tableRelatedDiffItemSchema = union([
  tableDiffItemSchema,
  tableNameDiffItemSchema,
  tableCommentDiffItemSchema,
])
export type TableRelatedDiffItem = InferOutput<
  typeof tableRelatedDiffItemSchema
>

export const columnRelatedDiffItemSchema = union([
  columnDiffItemSchema,
  columnNameDiffItemSchema,
  columnTypeDiffItemSchema,
  columnCommentDiffItemSchema,
  columnDefaultDiffItemSchema,
  columnCheckDiffItemSchema,
  columnNotNullDiffItemSchema,
])
export type ColumnRelatedDiffItem = InferOutput<
  typeof columnRelatedDiffItemSchema
>

export const indexRelatedDiffItemSchema = union([
  indexDiffItemSchema,
  indexNameDiffItemSchema,
  indexUniqueDiffItemSchema,
  indexColumnsDiffItemSchema,
  indexTypeDiffItemSchema,
])
export type IndexRelatedDiffItem = InferOutput<
  typeof indexRelatedDiffItemSchema
>

export const constraintRelatedDiffItemSchema = union([
  constraintDiffItemSchema,
  constraintNameDiffItemSchema,
  constraintColumnNameDiffItemSchema,
  constraintTargetTableNameDiffItemSchema,
  constraintTargetColumnNameDiffItemSchema,
  constraintUpdateConstraintDiffItemSchema,
  constraintDeleteConstraintDiffItemSchema,
  constraintDetailDiffItemSchema,
])
export type ConstraintRelatedDiffItem = InferOutput<
  typeof constraintRelatedDiffItemSchema
>

const schemaDiffItemSchema = union([
  tableRelatedDiffItemSchema,
  columnRelatedDiffItemSchema,
  indexRelatedDiffItemSchema,
  constraintRelatedDiffItemSchema,
])
export type SchemaDiffItem = InferOutput<typeof schemaDiffItemSchema>

export const schemaDiffItemsSchema = array(schemaDiffItemSchema)
