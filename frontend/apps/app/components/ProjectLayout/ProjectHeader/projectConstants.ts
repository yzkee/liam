import { BookMarked, ErdIcon } from '@liam-hq/ui'
import { type InferOutput, literal, union } from 'valibot'

export const PROJECT_TAB = {
  PROJECT: 'project',
  SCHEMA: 'schema',
} as const

export const ProjectTabSchema = union([
  literal(PROJECT_TAB.PROJECT),
  literal(PROJECT_TAB.SCHEMA),
])

export type ProjectTabValue = InferOutput<typeof ProjectTabSchema>

interface ProjectTab {
  value: ProjectTabValue
  label: string
  icon: typeof BookMarked | typeof ErdIcon
}

export const PROJECT_TABS: ProjectTab[] = [
  { value: PROJECT_TAB.PROJECT, label: 'Project', icon: BookMarked },
  { value: PROJECT_TAB.SCHEMA, label: 'Schema', icon: ErdIcon },
]
