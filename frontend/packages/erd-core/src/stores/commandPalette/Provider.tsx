import { type FC, type PropsWithChildren, useState } from 'react'
import { CommandPaletteContext } from './context'

type Props = PropsWithChildren

export const CommandPaletteProvider: FC<Props> = ({ children }) => {
  const [open, setOpen] = useState(false)

  return (
    <CommandPaletteContext.Provider value={{ open, setOpen }}>
      {children}
    </CommandPaletteContext.Provider>
  )
}
