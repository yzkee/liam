import { useCallback, useSyncExternalStore } from 'react'

interface SessionStorageChangeDetail {
  key: string
}

interface SessionStorageChangeEvent extends CustomEvent {
  detail: SessionStorageChangeDetail
}

type UseAutoStartExecutedFunc = (designSessionId: string) => {
  autoStartExecuted: boolean
  setAutoStartExecuted: (value: boolean) => void
}

export const useAutoStartExecuted: UseAutoStartExecutedFunc = (
  designSessionId,
) => {
  const storageKey = `autoStartExecuted_${designSessionId}`

  // Create a custom event dispatcher for same-tab updates
  const dispatchStorageChange = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent<SessionStorageChangeDetail>('sessionStorageChange', {
        detail: { key: storageKey },
      }),
    )
  }, [storageKey])

  // Get the current value from sessionStorage
  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem(storageKey) === 'true'
  }, [storageKey])

  // Server-side snapshot (always false)
  const getServerSnapshot = useCallback(() => false, [])

  // Subscribe to storage changes (both cross-tab and same-tab)
  const subscribe = useCallback(
    (callback: () => void) => {
      // Handle cross-tab storage changes
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === storageKey && e.storageArea === sessionStorage) {
          callback()
        }
      }

      // Handle same-tab custom events
      const handleCustomStorageChange = (e: Event) => {
        if (
          e instanceof CustomEvent &&
          (e as SessionStorageChangeEvent).detail?.key === storageKey
        ) {
          callback()
        }
      }

      window.addEventListener('storage', handleStorageChange)
      window.addEventListener('sessionStorageChange', handleCustomStorageChange)

      return () => {
        window.removeEventListener('storage', handleStorageChange)
        window.removeEventListener(
          'sessionStorageChange',
          handleCustomStorageChange,
        )
      }
    },
    [storageKey],
  )

  // Use the external store hook
  const autoStartExecuted = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  )

  // Set the value and dispatch custom event for same-tab updates
  const setAutoStartExecuted = useCallback(
    (value: boolean) => {
      if (typeof window === 'undefined') return
      sessionStorage.setItem(storageKey, value.toString())
      // Dispatch custom event for same-tab reactivity
      dispatchStorageChange()
    },
    [storageKey, dispatchStorageChange],
  )

  return { autoStartExecuted, setAutoStartExecuted }
}
