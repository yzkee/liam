import { useEffect } from 'react'
import { useUserEditingOrThrow } from '@/stores'

export const useSubscribeShowModeCommand = () => {
  const { setShowMode } = useUserEditingOrThrow()

  // Switch show mode when ⇧2, ⇧3 or ⇧4 is pressed
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.code === 'Digit2' && event.shiftKey) {
        setShowMode('ALL_FIELDS')
      }
      if (event.code === 'Digit3' && event.shiftKey) {
        setShowMode('TABLE_NAME')

        // biome-ignore lint/suspicious/noConsole: <explanation>
        console.log('shift+3 is executed')
      }
      if (event.code === 'Digit4' && event.shiftKey) {
        setShowMode('KEY_ONLY')
      }

      // TODO: remove this line, this is for testing
      // for investigation to resolve: https://github.com/liam-hq/liam/pull/2683#discussion_r2234827275
      if (event.code === 'Digit5' && event.shiftKey) {
        setShowMode('TABLE_NAME')

        // biome-ignore lint/suspicious/noConsole: <explanation>
        console.log('shift+5 is executed')
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [setShowMode])
}
