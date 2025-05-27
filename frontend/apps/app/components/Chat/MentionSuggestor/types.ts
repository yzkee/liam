import type * as React from 'react'
import type { ReactNode } from 'react'

export type InputProps = {
  id?: string
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

export type MentionSuggestionItem = {
  id: string
  label: string
  type?: 'group' | 'table' | 'column' | 'relation'
  icon?: ReactNode
  columnType?: 'primary' | 'foreign' | 'notNull' | 'nullable'
}

export interface MentionSuggestorProps {
  trigger: string // e.g. '@'
  input: string
  caret: number
  candidates: MentionSuggestionItem[]
  noItemsMessage?: string | ReactNode // default: "No items found"
  onSelect: (candidate: MentionSuggestionItem, byKeyboard?: boolean) => void
  onClose?: () => void
  visible: boolean
  className?: string
  filter?: (query: string, candidate: MentionSuggestionItem) => boolean
  onInputProps?: (inputProps: InputProps) => void
  maxItems?: number // Maximum number of items to display
}
