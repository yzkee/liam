import {
  DiamondFillIcon,
  DiamondIcon,
  KeyRound,
  Link,
  Table2,
} from '@liam-hq/ui'
import clsx from 'clsx'
import { Command } from 'cmdk'
import {
  type ComponentProps,
  type FC,
  useCallback,
  useEffect,
  useMemo,
} from 'react'
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
import { useTableOptionSelect } from './hooks/useTableOptionSelect'
import { type ColumnType, getColumnTypeMap } from './utils/getColumnTypeMap'

type Props = {
  tableName: string
  suggestion: CommandPaletteSuggestion | null
}

const ColumnIcon: FC<ComponentProps<'svg'> & { columnType: ColumnType }> = ({
  columnType,
  ...props
}) => {
  switch (columnType) {
    case 'PRIMARY_KEY':
      return <KeyRound {...props} />
    case 'FOREIGN_KEY':
      return <Link {...props} />
    case 'NOT_NULL':
      return <DiamondFillIcon aria-label={undefined} {...props} />
    case 'NULLABLE':
      return <DiamondIcon aria-label={undefined} {...props} />
  }
}

export const TableColumnOptions: FC<Props> = ({ tableName, suggestion }) => {
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

  // Select option by pressing [Enter] key (with/without ⌘ key)
  useEffect(() => {
    // It doesn't subscribe a keydown event listener if the suggestion type is not "column"
    if (suggestion?.type !== 'column') return

    const down = (event: KeyboardEvent) => {
      const { tableName, columnName } = suggestion

      if (event.key === 'Enter') {
        event.preventDefault()

        if (event.metaKey || event.ctrlKey) {
          window.open(getTableColumnLinkHref(tableName, columnName))
        } else {
          goToERD(tableName, columnName)
        }
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [suggestion, goToERD])

  const { tableOptionSelectHandler } = useTableOptionSelect(suggestion)

  const table = schema.current.tables[tableName]
  const columnTypeMap = useMemo(
    () => (table ? getColumnTypeMap(table) : {}),
    [table],
  )

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
          onClick={(event) => tableOptionSelectHandler(event, table.name)}
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
            {columnTypeMap[column.name] && (
              <ColumnIcon
                // biome-ignore lint/style/noNonNullAssertion: it checks the column type exists above
                columnType={columnTypeMap[column.name]!}
                className={styles.itemIcon}
              />
            )}
            <span className={styles.itemText}>{column.name}</span>
          </a>
        </Command.Item>
      ))}
    </Command.Group>
  )
}
