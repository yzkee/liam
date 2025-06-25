import { Search } from '@liam-hq/ui'
import type { FC } from 'react'
import { useCommandPalette } from '@/stores'
import styles from './CommandPaletteTriggerButton.module.css'

export const CommandPaletteTriggerButton: FC = () => {
  const { setOpen } = useCommandPalette()

  return (
    <button
      className={styles.container}
      type="button"
      onClick={() => setOpen(true)}
    >
      <Search className={styles.searchIcon} />
      <span className={styles.text}>Search</span>
      <span className={styles.keyIcon}>⌘</span>
      <span className={styles.keyIcon}>K</span>
    </button>
  )
}
