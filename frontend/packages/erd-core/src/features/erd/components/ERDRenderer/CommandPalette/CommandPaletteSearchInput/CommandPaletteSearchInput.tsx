import { Search } from '@liam-hq/ui'
import { Command } from 'cmdk'
import { type ComponentProps, type FC, useMemo } from 'react'
import type { CommandPaletteInputMode } from '../types'
import styles from './CommandPaletteSearchInput.module.css'

type Props = ComponentProps<typeof Command.Input> & {
  mode: CommandPaletteInputMode
  setMode: (mode: CommandPaletteInputMode) => void
}

export const CommandPaletteSearchInput: FC<Props> = ({
  mode,
  setMode,
  ...inputProps
}) => {
  const modePrefix = useMemo(() => {
    switch (mode.type) {
      case 'default':
        return null
      case 'command':
        return '>'
    }
  }, [mode])

  return (
    <div className={styles.container}>
      <Search className={styles.searchIcon} />
      <Command.Input
        {...inputProps}
        className={styles.input}
        placeholder="Search"
      />
    </div>
  )
}
