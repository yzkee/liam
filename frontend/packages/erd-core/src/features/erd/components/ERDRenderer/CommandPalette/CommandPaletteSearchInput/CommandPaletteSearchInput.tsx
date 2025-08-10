import { Search } from '@liam-hq/ui'
import { Command } from 'cmdk'
import type { ComponentProps, FC } from 'react'
import styles from './CommandPaletteSearchInput.module.css'

type Props = ComponentProps<typeof Command.Input>

export const CommandPaletteSearchInput: FC<Props> = (props) => {
  return (
    <div className={styles.container}>
      <Search className={styles.searchIcon} />
      <Command.Input {...props} className={styles.input} placeholder="Search" />
    </div>
  )
}
