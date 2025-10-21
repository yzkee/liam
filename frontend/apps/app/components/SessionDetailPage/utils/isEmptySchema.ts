import type { Schema } from '@liam-hq/schema'

export function isEmptySchema(schema: Schema): boolean {
  return (
    Object.keys(schema.tables).length === 0 &&
    Object.keys(schema.enums).length === 0 &&
    Object.keys(schema.extensions).length === 0
  )
}
