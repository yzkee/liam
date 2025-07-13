import { useEffect } from 'react'
import { useUserEditing } from '@/stores'

export const usePopStateListener = () => {
  const userEditingResult = useUserEditing()
  if (userEditingResult.isErr()) {
    throw userEditingResult.error
  }
  const { setIsPopstateInProgress } = userEditingResult.value

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
