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
      Search
    </button>
  )
}
