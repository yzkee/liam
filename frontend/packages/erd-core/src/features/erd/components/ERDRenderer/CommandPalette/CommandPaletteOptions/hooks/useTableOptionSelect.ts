import { useCallback, useEffect } from 'react'
import { useTableSelection } from '../../../../../../erd/hooks'
import { getTableLinkHref } from '../../../../../utils'
import { useCommandPaletteOrThrow } from '../../CommandPaletteProvider'
import type { CommandPaletteSuggestion } from '../../types'

export const useTableOptionSelect = (
  suggestion: CommandPaletteSuggestion | null,
) => {
  const { setOpen } = useCommandPaletteOrThrow()

  const { selectTable } = useTableSelection()
  const goToERD = useCallback(
    (tableName: string) => {
      selectTable({ tableId: tableName, displayArea: 'main' })
      setOpen(false)
    },
    [selectTable, setOpen],
  )

  const tableOptionSelectHandler = useCallback(
    (event: React.MouseEvent, tableName: string) => {
      // Do not call preventDefault to allow the default link behavior when ⌘ key is pressed
      if (event.ctrlKey || event.metaKey) {
        return
      }

      event.preventDefault()
      goToERD(tableName)
    },
    [goToERD],
  )

  // Select option by pressing [Enter] key (with/without ⌘ key)
  useEffect(() => {
    // It doesn't subscribe a keydown event listener if the suggestion type is not "table"
    if (suggestion?.type !== 'table') return

    const down = (event: KeyboardEvent) => {
      const suggestedTableName = suggestion.name

      if (event.key === 'Enter') {
        event.preventDefault()

        if (event.metaKey || event.ctrlKey) {
          window.open(getTableLinkHref(suggestedTableName))
        } else {
          goToERD(suggestedTableName)
        }
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [suggestion, goToERD])

  return { tableOptionSelectHandler }
}
