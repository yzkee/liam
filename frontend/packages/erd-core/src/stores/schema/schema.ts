import { schemaSchema } from '@liam-hq/db-structure'
import * as v from 'valibot'

export const schemaStoreSchema = v.object({
  current: schemaSchema,
  previous: v.optional(schemaSchema),
})

export type SchemaStore = v.InferOutput<typeof schemaStoreSchema>
