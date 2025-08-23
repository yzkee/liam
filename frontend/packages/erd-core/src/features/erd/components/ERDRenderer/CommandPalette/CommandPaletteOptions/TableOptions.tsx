import { Table2 } from '@liam-hq/ui'
import { Command } from 'cmdk'
import { type FC, useCallback } from 'react'
import { useTableSelection } from '@/features/erd/hooks'
import { useSchemaOrThrow } from '@/stores'
import { useCommandPalette } from '../CommandPaletteProvider'
import { getSuggestionText } from '../utils'
import styles from './CommandPaletteOptions.module.css'

export const getTableLinkHref = (activeTableName: string) => {
  const searchParams = new URLSearchParams(window.location.search)
  searchParams.set('active', activeTableName)
  return `?${searchParams.toString()}`
}

export const TableOptions: FC = () => {
  const result = useCommandPalette()
  const setOpen = result.isOk() ? result.value.setOpen : () => {}

  const schema = useSchemaOrThrow()

  const { selectTable } = useTableSelection()

  const goToERD = useCallback(
    (tableName: string) => {
      selectTable({ tableId: tableName, displayArea: 'main' })
      setOpen(false)
    },
    [selectTable, setOpen],
  )

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
