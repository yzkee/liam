import { useEffect } from 'react'
import { useCustomReactflow } from '@/features/reactflow/hooks'

export const useSubscribeZoomToFitCommand = () => {
  const { fitView } = useCustomReactflow()

  // Tidy up ERD when ⇧1 is pressed
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.code === 'Digit1' && event.shiftKey) {
        fitView()
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [fitView])
}
