import { useEffect } from 'react'
import { useUserEditingOrThrow } from '@/stores'

export const usePopStateListener = () => {
  const userEditing = useUserEditingOrThrow()
  const { setIsPopstateInProgress } = userEditing

  useEffect(() => {
    const handlePopstate = () => {
      setIsPopstateInProgress(true)
      // Reset the flag in the next tick
      setTimeout(() => setIsPopstateInProgress(false), 0)
    }

    window.addEventListener('popstate', handlePopstate)
    return () => window.removeEventListener('popstate', handlePopstate)
  }, [setIsPopstateInProgress])
}
