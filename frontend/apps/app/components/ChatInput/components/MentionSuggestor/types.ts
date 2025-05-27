import type * as React from 'react'
import type { ReactNode } from 'react'

export type InputProps = {
  id?: string
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

export type MentionItem = {
  id: string
  label: string
  type?: 'group' | 'table' | 'column' | 'relation'
  icon?: ReactNode
  columnType?: 'primary' | 'foreign' | 'notNull' | 'nullable'
}
