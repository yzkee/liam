'use client'

import * as RadixToast from '@radix-ui/react-toast'
import clsx from 'clsx'
import {
  createContext,
  type FC,
  type PropsWithChildren,
  useCallback,
  useState,
} from 'react'
import styles from './Toast.module.css'
import type { ToastFn, ToastItem, ToastOptions } from './types'

type Props = ToastOptions & {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}

export const Toast: FC<Props> = ({
  title,
  description,
  isOpen,
  onOpenChange,
  status,
}) => {
  return (
    <RadixToast.Root
      className={clsx(
        styles.wrapper,
        status === 'success' && styles.success,
        status === 'error' && styles.error,
        status === 'warning' && styles.warning,
        status === 'info' && styles.info,
      )}
      open={isOpen}
      onOpenChange={onOpenChange}
    >
      <RadixToast.Title className={styles.title}>{title}</RadixToast.Title>
      {description && (
        <RadixToast.Description className={styles.description}>
          {description}
        </RadixToast.Description>
      )}
    </RadixToast.Root>
  )
}

export const ToastContext = createContext<{
  headerToast: ToastFn
  commandPaletteToast: ToastFn
}>({
  headerToast: () => {},
  commandPaletteToast: () => {},
})

const useToastDisplay = () => {
  const [toastItem, setToastItem] = useState<ToastItem | null>(null)
  const closeToastItem = useCallback(() => {
    setToastItem((prev) => (prev === null ? null : { ...prev, isOpen: false }))
  }, [])
  const createToastItem = useCallback((options: ToastOptions) => {
    closeToastItem()
    window.setTimeout(() => setToastItem({ ...options, isOpen: true }), 100)
  }, [])

  return { toastItem, createToastItem, closeToastItem }
}

export const ToastProvider = ({ children }: PropsWithChildren) => {
  const {
    toastItem: headerToastItem,
    createToastItem: createHeaderToastItem,
    closeToastItem: closeHeaderToastItem,
  } = useToastDisplay()
  const {
    toastItem: commandPaletteToastItem,
    createToastItem: createCommandPaletteToastItem,
    closeToastItem: closeCommandPaletteToastItem,
  } = useToastDisplay()

  return (
    <ToastContext.Provider
      value={{
        headerToast: createHeaderToastItem,
        commandPaletteToast: createCommandPaletteToastItem,
      }}
    >
      {children}
      <RadixToast.Provider>
        {headerToastItem && (
          <Toast {...headerToastItem} onOpenChange={closeHeaderToastItem} />
        )}
        <RadixToast.Viewport className={clsx(styles.viewport, styles.header)} />
      </RadixToast.Provider>
      <RadixToast.Provider>
        {commandPaletteToastItem && (
          <Toast
            {...commandPaletteToastItem}
            onOpenChange={closeCommandPaletteToastItem}
          />
        )}
        <RadixToast.Viewport
          className={clsx(styles.viewport, styles.commandPalette)}
        />
      </RadixToast.Provider>
    </ToastContext.Provider>
  )
}
