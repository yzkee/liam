import { Table2 } from '@liam-hq/ui'
import clsx from 'clsx'
import { Command } from 'cmdk'
import { type FC, useCallback } from 'react'
import {
  getTableColumnElementId,
  getTableColumnLinkHref,
  getTableLinkHref,
} from '../../../../../../features'
import { useSchemaOrThrow } from '../../../../../../stores'
import { useTableSelection } from '../../../../hooks'
import { useCommandPaletteOrThrow } from '../CommandPaletteProvider'
import type { CommandPaletteSuggestion } from '../types'
import { getSuggestionText } from '../utils'
import styles from './CommandPaletteOptions.module.css'

type Props = {
  tableName: string
  suggestion: CommandPaletteSuggestion | null
}

export const TableColumnOptions: FC<Props> = ({ tableName }) => {
  const schema = useSchemaOrThrow()
  const { selectTable } = useTableSelection()
  const { setOpen } = useCommandPaletteOrThrow()

  const goToERD = useCallback(
    (tableName: string, columnName?: string) => {
      selectTable({ tableId: tableName, displayArea: 'main' })
      setOpen(false)
      if (columnName) {
        window.location.hash = getTableColumnElementId(tableName, columnName)
      }
    },
    [setOpen, selectTable],
  )

  const table = schema.current.tables[tableName]
  if (!table) {
    return null
  }

  return (
    <Command.Group heading="Tables">
      <Command.Item
        value={getSuggestionText({ type: 'table', name: table.name })}
      >
        <a
          className={styles.item}
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
      {Object.values(table.columns).map((column) => (
        <Command.Item
          key={column.name}
          value={getSuggestionText({
            type: 'column',
            tableName: table.name,
            columnName: column.name,
          })}
        >
          <a
            className={clsx(styles.item, styles.indent)}
            href={getTableColumnLinkHref(table.name, column.name)}
            onClick={(event) => {
              // Do not call preventDefault to allow the default link behavior when ⌘ key is pressed
              if (event.ctrlKey || event.metaKey) {
                return
              }

              event.preventDefault()
              goToERD(table.name, column.name)
            }}
          >
            <Table2 className={styles.itemIcon} />
            <span className={styles.itemText}>{column.name}</span>
          </a>
        </Command.Item>
      ))}
    </Command.Group>
  )
}
