import { Search } from '@liam-hq/ui'
import { Command } from 'cmdk'
import {
  type ComponentProps,
  type FC,
  type KeyboardEventHandler,
  useCallback,
  useMemo,
  useState,
} from 'react'
import type {
  CommandPaletteInputMode,
  CommandPaletteSuggestion,
} from '../types'
import styles from './CommandPaletteSearchInput.module.css'

type Props = ComponentProps<typeof Command.Input> & {
  mode: CommandPaletteInputMode
  suggestion: CommandPaletteSuggestion | null
  setMode: (mode: CommandPaletteInputMode) => void
}

export const CommandPaletteSearchInput: FC<Props> = ({
  mode,
  suggestion,
  setMode,
  ...inputProps
}) => {
  const [value, setValue] = useState('')

  const modePrefix = useMemo(() => {
    switch (mode.type) {
      case 'default':
        return null
      case 'command':
        return '>'
      case 'table':
        return `${mode.tableName} /`
    }
  }, [mode])

  const handleKeydown: KeyboardEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      switch (mode.type) {
        case 'default': {
          // switch to "command" mode if value is empty and `>` is pressed
          if (event.key === '>' && value === '') {
            event.preventDefault()
            setMode({ type: 'command' })
            return
          }

          // switch to "table" mode if a table is suggested and Tab key is pressed
          if (event.key === 'Tab' && suggestion?.type === 'table') {
            event.preventDefault()
            setMode({ type: 'table', tableName: suggestion.name })
            setValue('')
            return
          }

          break
        }

        case 'command':
        case 'table': {
          // switch to "default" mode if value is empty and delete key is pressed
          if (event.key === 'Backspace' && value === '') {
            event.preventDefault()
            setMode({ type: 'default' })
            return
          }

          break
        }
      }
    },
    [mode.type, value, setMode, suggestion],
  )

  return (
    <div className={styles.container}>
      <Search className={styles.searchIcon} />
      <div className={styles.inputContainer}>
        {modePrefix && <span className={styles.modePrefix}>{modePrefix}</span>}
        <Command.Input
          {...inputProps}
          value={value}
          onValueChange={setValue}
          className={styles.input}
          placeholder="Search"
          onKeyDown={handleKeydown}
        />
      </div>
    </div>
  )
}
