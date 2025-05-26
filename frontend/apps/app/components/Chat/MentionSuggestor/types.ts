import type * as React from 'react'
import type { ReactNode } from 'react'

export type MentionSuggestionItem = {
  id: string
  label: string
  type?: string // e.g. 'table', 'user', 'command', etc.
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
  onInputProps?: (inputProps: {
    id?: string
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  }) => void
  maxItems?: number // Maximum number of items to display
}
