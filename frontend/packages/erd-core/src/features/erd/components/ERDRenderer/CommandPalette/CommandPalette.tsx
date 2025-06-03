'use client'

import { Command } from 'cmdk'
import { type FC, useEffect, useState } from 'react'
import styles from './CommandPalette.module.css'

export const CommandPalette: FC = () => {
  const [open, setOpen] = useState(false)

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      contentClassName={styles.content}
    >
      Coming Soon...
    </Command.Dialog>
  )
}
