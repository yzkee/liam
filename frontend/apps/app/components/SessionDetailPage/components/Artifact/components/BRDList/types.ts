import type { Schema } from '@liam-hq/db-structure'

export type BusinessRequirement = {
  id: string
  title: string
  overview: string[]
  relatedSchema: Schema
}
