import { Table2 } from '@liam-hq/ui'
import { Command } from 'cmdk'
import { type FC, useCallback, useEffect } from 'react'
import { useTableSelection } from '@/features/erd/hooks'
import { useSchemaOrThrow } from '@/stores'
import { useCommandPalette } from '../CommandPaletteProvider'
import type { CommandPaletteSuggestion } from '../types'
import { getSuggestionText } from '../utils'
import styles from './CommandPaletteOptions.module.css'

const getTableLinkHref = (activeTableName: string) => {
  const searchParams = new URLSearchParams(window.location.search)
  searchParams.set('active', activeTableName)
  return `?${searchParams.toString()}`
}

type Props = {
  suggestion: CommandPaletteSuggestion | null
}

export const TableOptions: FC<Props> = ({ suggestion }) => {
  const result = useCommandPalette()
  const setOpen = result.isOk() ? result.value.setOpen : () => {}

  const schema = useSchemaOrThrow()
  const suggestedTableName =
    suggestion?.type === 'table' ? suggestion.name : null

  const { selectTable } = useTableSelection()

  const goToERD = useCallback(
    (tableName: string) => {
      selectTable({ tableId: tableName, displayArea: 'main' })
      setOpen(false)
    },
    [selectTable, setOpen],
  )

  // Select option by pressing [Enter] key (with/without ⌘ key)
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (!suggestedTableName) return

      if (event.key === 'Enter') {
        if (event.metaKey || event.ctrlKey) {
          window.open(getTableLinkHref(suggestedTableName))
        } else {
          goToERD(suggestedTableName)
        }
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [suggestedTableName, goToERD])

  return (
    <Command.Group heading="Tables">
      {Object.values(schema.current.tables).map((table) => (
        <Command.Item
          key={table.name}
          className={styles.item}
          value={getSuggestionText({ type: 'table', name: table.name })}
          asChild
        >
          <a
            href={getTableLinkHref(table.name)}
            onClick={(event) => {
              // Do not call preventDefault to allow the default link behavior when ⌘ key is pressed
              if (event.ctrlKey || event.metaKey) {
                return
              }

              event.preventDefault()
              goToERD(table.name)
            }}
          >
            <Table2 className={styles.itemIcon} />
            <span className={styles.itemText}>{table.name}</span>
          </a>
        </Command.Item>
      ))}
    </Command.Group>
  )
}
