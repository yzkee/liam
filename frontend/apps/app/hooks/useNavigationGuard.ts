import { useEffect } from 'react'

export const useNavigationGuard = (beforeNavigate: () => void) => {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest('a:not([target="_blank"])')
      ) {
        beforeNavigate()
      }
    }

    const handleBeforeUnload = () => {
      beforeNavigate()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('click', handleClick, true)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('click', handleClick, true)
    }
  }, [beforeNavigate])
}
