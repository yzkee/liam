import { createContext } from 'react'

type CommandPaletteContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
}

export const CommandPaletteContext =
  createContext<CommandPaletteContextValue | null>(null)
